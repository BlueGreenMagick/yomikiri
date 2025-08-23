use anyhow::Result;
use rusqlite::Connection;

use crate::error::{FFIResult, ToUniFFIResult};

use super::store::{set_store, KEYS};
use super::{ConnectionTrait, RustDatabase};

#[uniffi::export]
impl RustDatabase {
    pub fn uniffi_get_db_version(&self) -> FFIResult<u32> {
        get_db_version(&self.conn()).uniffi()
    }

    pub fn uniffi_db_migrate_from_0(&self, data: MigrateFromV0Data) -> FFIResult<()> {
        self.db_migrate_from_0(data).uniffi()
    }
}

impl RustDatabase {
    /// Migrate from db version 0 to 1
    fn db_migrate_from_0(&self, data: MigrateFromV0Data) -> Result<()> {
        let mut conn = self.conn();
        let tx = conn.transaction()?;
        tx.execute_batch(include_str!("sql/0_to_1.sql"))?;
        if let Some(val) = data.web_config {
            set_store(&tx, "web_config", &val)?;
        }
        if let Some(val) = data.jmdict_etag {
            KEYS::jmdict_etag().set(&tx, Some(val))?;
        }
        if let Some(val) = data.jmnedict_etag {
            KEYS::jmnedict_etag().set(&tx, Some(val))?;
        }
        if let Some(val) = data.dict_schema_ver {
            KEYS::dict_schema_ver().set(&tx, Some(val))?;
        }
        tx.sql("PRAGMA user_version = 1")?.execute([])?;
        tx.commit()?;
        Ok(())
    }
}

fn get_db_version(db: &Connection) -> Result<u32> {
    db.sql("SELECT user_version FROM pragma_user_version")?
        .query_row([], |r| r.get(0))
        .map_err(Into::into)
}

#[derive(Debug, PartialEq, Eq, uniffi::Record)]
pub struct MigrateFromV0Data {
    web_config: Option<String>,
    jmdict_etag: Option<String>,
    jmnedict_etag: Option<String>,
    dict_schema_ver: Option<u16>,
}
