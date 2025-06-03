use anyhow::Result;

use crate::error::{FFIResult, ToUniFFIResult};

use super::storage::{set_storage, KEYS};
use super::RustDatabase;

#[uniffi::export]
impl RustDatabase {
    pub fn migrate_from_0(&self, data: MigrateFromV0Data) -> FFIResult<()> {
        self._migrate_from_0(data).uniffi()
    }
}

impl RustDatabase {
    fn _migrate_from_0(&self, data: MigrateFromV0Data) -> Result<()> {
        let mut conn = self.conn();
        let tx = conn.transaction()?;
        tx.execute_batch(include_str!("sql/0_to_1.sql"))?;
        if let Some(val) = data.web_config {
            set_storage(&tx, "web_config", &val)?;
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
        tx.commit()?;
        Ok(())
    }
}

#[derive(Debug, PartialEq, Eq, uniffi::Record)]
pub struct MigrateFromV0Data {
    web_config: Option<String>,
    jmdict_etag: Option<String>,
    jmnedict_etag: Option<String>,
    dict_schema_ver: Option<u16>,
}
