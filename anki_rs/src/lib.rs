use std::collections::HashMap;
use std::path::{Path, PathBuf};

use anki::collection::{Collection, CollectionBuilder};
use anki::sync::collection::normal::SyncActionRequired;
use anki::sync::collection::status::online_sync_status_check;
use anki::sync::http_client::HttpSyncClient;
use anki::sync::login::{sync_login, SyncAuth};
use reqwest::Url;
use rusqlite::{params, Connection};
use serde::de::DeserializeOwned;
use serde::Serialize;
use snafu::prelude::*;
use tokio::runtime;

#[derive(Debug, Snafu)]
pub enum AnkiErr {
    #[snafu(context(false))]
    Anki {
        source: anki::error::AnkiError,
    },
    #[snafu(context(false))]
    Sql {
        source: rusqlite::Error,
    },
    #[snafu(context(false))]
    SerdeJson {
        source: serde_json::Error,
    },
    #[snafu(context(false))]
    FromSql {
        source: rusqlite::types::FromSqlError,
    },
    InvalidAuth,
    #[snafu(display("Unreachable: AnkiManager.col is None"))]
    NoCollection,
    #[snafu(display("{message}"))]
    Other {
        message: &'static str,
    },
    InvalidDeckName,
    InvalidNotetypeName,
    InvalidNotetypeFieldName,
}

type Result<T> = std::result::Result<T, AnkiErr>;

#[derive(Debug)]
pub struct Field {
    pub name: String,
    pub value: String,
}

#[derive(Debug)]
pub struct NoteData {
    pub deck: String,
    pub notetype: String,
    pub fields: Vec<Field>,
    pub tags: String,
}

pub struct AnkiManager {
    db_dir: PathBuf,
    col: Option<Collection>,
    // yomikiri-specific db
    ydb: Connection,
    runtime: runtime::Runtime,
    endpoint: Option<String>,
}

impl AnkiManager {
    pub fn try_new<P: Into<PathBuf>>(db_dir: P) -> Result<Self> {
        let db_dir = db_dir.into();

        let col = open_collection(&db_dir)?;
        let ydb = open_ydb(&db_dir)?;
        let runtime = runtime::Builder::new_multi_thread()
            .enable_all()
            .build()
            .unwrap();

        let mut anki = AnkiManager {
            db_dir: db_dir,
            col: Some(col),
            ydb,
            runtime,
            endpoint: None,
        };
        anki.sync_meta()?;
        Ok(anki)
    }

    fn col(&self) -> Result<&Collection> {
        self.col.as_ref().ok_or(AnkiErr::NoCollection)
    }

    fn mut_col(&mut self) -> Result<&mut Collection> {
        self.col.as_mut().ok_or(AnkiErr::NoCollection)
    }

    pub fn add_note(&mut self, note_data: &NoteData) -> Result<()> {
        let did = self
            .col()?
            .get_deck_id(&note_data.deck)?
            .ok_or(AnkiErr::InvalidDeckName)?;
        let notetype = self
            .mut_col()?
            .get_notetype_by_name(&note_data.notetype)?
            .ok_or(AnkiErr::InvalidNotetypeName)?;

        let mut note = notetype.new_note();
        note.tags = note_data.tags.split(' ').map(String::from).collect();

        let mut field_name_to_idx = HashMap::new();
        for ntfield in &notetype.fields {
            if let Some(ord) = ntfield.ord {
                field_name_to_idx.insert(ntfield.name.as_str(), ord);
            }
        }
        for field in &note_data.fields {
            let idx = field_name_to_idx
                .get(field.name.as_str())
                .ok_or(AnkiErr::InvalidNotetypeFieldName)?;
            note.set_field(*idx as usize, &field.value)?;
        }

        self.mut_col()?.add_note(&mut note, did)?;
        Ok(())
    }

    pub fn notetype_names(&mut self) -> Result<Vec<String>> {
        let names = self
            .mut_col()?
            .storage
            .get_all_notetype_names()?
            .into_iter()
            .map(|(_id, name)| name)
            .collect();
        Ok(names)
    }

    pub fn notetype_fields(&mut self, notetype: &str) -> Result<Vec<String>> {
        let nt = self.mut_col()?.get_notetype_by_name(notetype)?;
        let fields = match nt {
            Some(nt) => nt.fields.iter().map(|f| f.name.to_string()).collect(),
            None => vec![],
        };
        Ok(fields)
    }

    pub fn deck_names(&mut self) -> Result<Vec<String>> {
        let names = self
            .mut_col()?
            .get_all_normal_deck_names()?
            .into_iter()
            .map(|(_id, name)| name)
            .collect();
        Ok(names)
    }

    fn runtime(&self) -> runtime::Handle {
        self.runtime.handle().clone()
    }

    // handle 308 redirects
    // does nothing if no auth
    fn sync_meta(&mut self) -> Result<()> {
        let local = self.col()?.sync_meta()?;
        let auth = self.auth()?;
        if let Some(auth) = auth {
            let mut client = HttpSyncClient::new(auth);
            let state = self
                .runtime()
                .block_on(online_sync_status_check(local, &mut client))?;
            if state.new_endpoint.is_some() {
                self.endpoint = state.new_endpoint;
            }
        }
        Ok(())
    }

    pub fn sync(&mut self) -> Result<()> {
        self.runtime().block_on(self.sync_inner())
    }

    async fn sync_inner(&mut self) -> Result<()> {
        let auth = self.auth()?;
        if let Some(auth) = auth {
            let out = self.mut_col()?.normal_sync(auth.clone(), |_, _| {}).await?;
            if let SyncActionRequired::FullSyncRequired {
                upload_ok: _,
                download_ok,
            } = out.required
            {
                if download_ok {
                    self.col
                        .take()
                        .unwrap()
                        .full_download(auth, Box::new(|_, _| {}))
                        .await?;
                    self.col = Some(open_collection(&self.db_dir)?);
                    Ok(())
                } else {
                    Err(AnkiErr::Other {
                        message: "No collection on AnkiWeb",
                    })
                }
            } else {
                Ok(())
            }
        } else {
            Err(AnkiErr::InvalidAuth)
        }
    }

    pub fn auth(&self) -> Result<Option<SyncAuth>> {
        let hkey = self.get_config_optional("auth_hkey")?;
        if let Some(hkey) = hkey {
            let endpoint = self
                .endpoint
                .as_ref()
                .map(|e| Url::try_from(e.as_str()).ok())
                .flatten();

            Ok(Some(SyncAuth {
                hkey,
                endpoint,
                io_timeout_secs: None,
            }))
        } else {
            Ok(None)
        }
    }

    /// login and save auth
    pub fn login(&mut self, username: &str, password: &str) -> Result<SyncAuth> {
        let auth = self.runtime().block_on(sync_login(
            username,
            password,
            Some(String::from("https://sync.ankiweb.net/")),
        ))?;
        self.set_config("auth_hkey", &auth.hkey)?;
        self.set_config("auth_username", &username)?;
        self.sync_meta()?;
        Ok(auth)
    }

    fn set_config<'a, T: Serialize, K: Into<&'a str>>(&self, key: K, val: &T) -> Result<()> {
        let key = key.into();
        let val = serde_json::to_vec(val)?;
        self.ydb
            .prepare_cached("INSERT OR REPLACE INTO config (name, value) VALUES (?, ?)")?
            .execute(params![&key, &val])?;
        Ok(())
    }

    fn get_config_optional<'a, T, K>(&self, key: K) -> Result<Option<T>>
    where
        T: DeserializeOwned,
        K: Into<&'a str>,
    {
        let key = key.into();
        self.ydb
            .prepare_cached("SELECT value FROM config WHERE name = ?")?
            .query_and_then([key], |row| {
                let blob = row.get_ref_unwrap(0).as_blob()?;
                serde_json::from_slice(blob).map_err(Into::into)
            })?
            .next()
            .transpose()
    }
}

fn open_collection(db_dir: &Path) -> Result<Collection> {
    let col_path = db_dir.join("anki.sqlite");
    CollectionBuilder::new(col_path).build().map_err(Into::into)
}

fn open_ydb(db_dir: &Path) -> Result<Connection> {
    let ydb_path = db_dir.join("yomikiri.sqlite");
    let ydb = Connection::open(&ydb_path)?;

    let user_version: u8 = ydb
        .prepare("SELECT user_version FROM pragma_user_version")?
        .query_row([], |row| row.get(0))?;

    // create db
    if user_version == 0 {
        ydb.execute_batch(include_str!("schema.sql"))?;
    }

    Ok(ydb)
}

pub fn setup_logger() {
    let logger = oslog::OsLogger::new("com.yoonchae.Yomikiri.Extension")
        .level_filter(log::LevelFilter::Debug);
    if logger.init().is_err() {
        log::warn!("os_log was already initialized");
    }
}

#[cfg(test)]
mod tests {
    use std::env;
    use std::path::Path;

    use crate::{AnkiManager, Field, NoteData};

    #[test]
    fn test_add_note() {
        let username = env::var("USERNAME").unwrap();
        let password = env::var("PASSWORD").unwrap();

        let mut anki = AnkiManager::try_new(Path::new("test")).unwrap();
        anki.login(&username, &password).unwrap();
        println!("logged in");
        anki.sync().unwrap();
        println!("syncing");
        let ntnames = anki.notetype_names().unwrap();
        println!("ntnames: {:?}", &ntnames);
        let decknames = anki.deck_names().unwrap();
        println!("decknames: {:?}", &decknames);
        let ntfields = anki.notetype_fields(&ntnames[0]).unwrap();
        println!("ntfields: {:?}", &ntfields);
        let mut note_data = NoteData {
            deck: decknames[0].clone(),
            notetype: ntnames[0].clone(),
            fields: vec![],
            tags: "tag1 tag2".to_string(),
        };
        for ntfield in ntfields {
            let field = Field {
                name: ntfield,
                value: "example".to_string(),
            };
            note_data.fields.push(field);
        }
        anki.add_note(&note_data).unwrap();
        println!("note added");
        anki.sync().unwrap();
    }
}
