#![cfg(uniffi)]

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, MutexGuard};

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

use crate::utils;

#[derive(Debug, Snafu, uniffi::Error)]
#[uniffi(flat_error)]
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

macro_rules! col {
    ($self:ident) => {
        $self.col().as_ref().ok_or(AnkiErr::NoCollection)
    };
}

macro_rules! mut_col {
    ($self:ident) => {
        $self.col().as_mut().ok_or(AnkiErr::NoCollection)
    };
}

#[derive(Debug, uniffi::Record)]
pub struct Field {
    pub name: String,
    pub value: String,
}

#[derive(Debug, uniffi::Record)]
pub struct NoteData {
    pub deck: String,
    pub notetype: String,
    pub fields: Vec<Field>,
    pub tags: String,
}

#[derive(uniffi::Object)]
pub struct AnkiManager {
    db_dir: PathBuf,
    col: Mutex<Option<Collection>>,
    // yomikiri-specific db
    ydb: Mutex<Connection>,
    runtime: runtime::Runtime,
    endpoint: Mutex<Option<String>>,
}

#[uniffi::export]
impl AnkiManager {
    #[uniffi::constructor]
    pub fn try_new(db_dir: String) -> Result<Arc<Self>> {
        utils::setup_logger();
        log::info!("AnkiManager::try_new: {}", utils::time_now());

        let db_dir = Path::new(&db_dir);

        let col = open_collection(db_dir)?;
        let ydb = open_ydb(db_dir)?;
        let runtime = runtime::Builder::new_multi_thread()
            .enable_all()
            .build()
            .unwrap();

        let anki = AnkiManager {
            db_dir: db_dir.to_owned(),
            col: Mutex::new(Some(col)),
            ydb: Mutex::new(ydb),
            runtime,
            endpoint: Mutex::new(None),
        };
        anki.sync_meta()?;
        Ok(Arc::new(anki))
    }

    pub fn add_note(&self, note_data: NoteData) -> Result<i64> {
        let mut col_guard = self.col();
        let col = col_guard.as_mut().ok_or(AnkiErr::NoCollection)?;

        let did = col
            .get_deck_id(&note_data.deck)?
            .ok_or(AnkiErr::InvalidDeckName)?;
        let notetype = col
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

        mut_col!(self)?.add_note(&mut note, did)?;
        Ok(note.id.0)
    }

    pub fn notetype_names(&self) -> Result<Vec<String>> {
        let names = mut_col!(self)?
            .storage
            .get_all_notetype_names()?
            .into_iter()
            .map(|(_id, name)| name)
            .collect();
        Ok(names)
    }

    /// returns [] if notetype with name is not found.
    pub fn notetype_fields(&self, notetype: String) -> Result<Vec<String>> {
        let nt = mut_col!(self)?.get_notetype_by_name(&notetype)?;
        let fields = match nt {
            Some(nt) => nt.fields.iter().map(|f| f.name.to_string()).collect(),
            None => vec![],
        };
        Ok(fields)
    }

    pub fn deck_names(&self) -> Result<Vec<String>> {
        let names = mut_col!(self)?
            .get_all_normal_deck_names()?
            .into_iter()
            .map(|(_id, name)| name)
            .collect();
        Ok(names)
    }

    pub fn sync(&self) -> Result<()> {
        self.runtime().block_on(self.sync_inner())
    }

    /// login and save auth
    pub fn login(&self, username: String, password: String) -> Result<()> {
        let auth = self.runtime().block_on(sync_login(
            &username,
            &password,
            Some(String::from("https://sync.ankiweb.net/")),
        ))?;
        log::info!("anki: Logged in to ankiweb with username {}", username);
        self.set_config("auth_hkey", &auth.hkey)?;
        self.set_config("auth_username", &username)?;
        self.sync_meta()?;
        Ok(())
    }
}

impl AnkiManager {
    fn runtime(&self) -> runtime::Handle {
        self.runtime.handle().clone()
    }

    fn ydb(&self) -> MutexGuard<Connection> {
        self.ydb.lock().unwrap()
    }

    fn col(&self) -> MutexGuard<Option<Collection>> {
        self.col.lock().unwrap()
    }

    fn auth(&self) -> Result<Option<SyncAuth>> {
        let hkey = self.get_config_optional("auth_hkey")?;
        if let Some(hkey) = hkey {
            let endpoint = self
                .endpoint
                .lock()
                .unwrap()
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

    async fn sync_inner(&self) -> Result<()> {
        let auth = self.auth()?;
        if let Some(auth) = auth {
            let mut col_guard = self.col();
            let out = col_guard
                .as_mut()
                .ok_or(AnkiErr::NoCollection)?
                .normal_sync(auth.clone(), |_, _| {})
                .await?;

            if let SyncActionRequired::FullSyncRequired {
                upload_ok: _,
                download_ok,
            } = out.required
            {
                log::info!("anki: full sync required.");
                if download_ok {
                    log::info!("anki: full download starting");
                    col_guard
                        .take()
                        .ok_or(AnkiErr::NoCollection)?
                        .full_download(auth, Box::new(|_, _| {}))
                        .await?;
                    log::info!("anki: full download complete");
                    col_guard.replace(open_collection(&self.db_dir)?);
                    Ok(())
                } else {
                    log::warn!("No collection to full download on ankiweb.");
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

    // handle 308 redirects
    // does nothing if no auth
    fn sync_meta(&self) -> Result<()> {
        let local = col!(self)?.sync_meta()?;
        let auth = self.auth()?;
        if let Some(auth) = auth {
            let mut client = HttpSyncClient::new(auth);
            let state = self
                .runtime()
                .block_on(online_sync_status_check(local, &mut client))?;
            if let Some(new_endpoint) = state.new_endpoint {
                self.endpoint.lock().unwrap().replace(new_endpoint);
            }
        }
        Ok(())
    }

    fn set_config<'a, T: Serialize, K: Into<&'a str>>(&self, key: K, val: &T) -> Result<()> {
        let key = key.into();
        let val = serde_json::to_vec(val)?;
        self.ydb()
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
        self.ydb()
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

#[cfg(test)]
mod tests {
    use std::env;

    use super::{AnkiManager, Field, NoteData};

    #[test]
    fn test_add_note() {
        let username = env::var("USERNAME").unwrap();
        let password = env::var("PASSWORD").unwrap();

        let anki = AnkiManager::try_new("test".to_string()).unwrap();
        anki.login(username, password).unwrap();
        println!("logged in");
        anki.sync().unwrap();
        println!("syncing");
        let ntnames = anki.notetype_names().unwrap();
        println!("ntnames: {:?}", &ntnames);
        let decknames = anki.deck_names().unwrap();
        println!("decknames: {:?}", &decknames);
        let ntfields = anki.notetype_fields(ntnames[0].clone()).unwrap();
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
        anki.add_note(note_data).unwrap();
        println!("note added");
        anki.sync().unwrap();
    }
}
