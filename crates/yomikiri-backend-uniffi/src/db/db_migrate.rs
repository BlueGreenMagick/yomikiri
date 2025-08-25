//! Database migration system for Yomikiri's SQLite storage.
//!
//! This module handles versioned database schema evolution using SQLite's `PRAGMA user_version`.
//! Migrations are applied incrementally with support for version skipping and optimized
//! new installation setup.
//!
//! ## Migration Process
//!
//! **Version Detection**: Current DB version is retrieved via `uniffi_get_db_version()`
//!
//! **New Installation (version 0)**:
//! - No legacy data → Complete setup in one step (without going through each migration steps) (TODO)
//! - Has legacy data → Migrate from previous storage system
//!
//! **Existing Databases**: Sequential migration with version skipping capability
//! - App calls migration functions one by one: `uniffi_db_migrate_from_3()` → `uniffi_db_migrate_from_5()`
//! - Each function returns the new version number (may skip intermediate versions)
//! - App uses returned version to determine next migration step
//!
//! Separate function calls allow apps to update progress indicators between migration steps
//!
//!
//! ## Difference with User Data Migration
//! DB migration is separate from user data migration.
//! DB migration does the minimal job of migrating to new DB schema.
//! Meanwhile, user data migration may run later to change the data stored within DB.
//!
//! db migration methods are prefixed with `db_migrate`,
//! while user data migration methods are prefixed with just `migrate`

use anyhow::Result;
use rusqlite::Connection;

use crate::db::store::StoreKey;
use crate::db::JsonStoreKey;
use crate::error::{FFIResult, ToUniFFIResult};

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
        tx.execute_batch(include_str!("sql/db_migrate_from_0_to_1.sql"))?;
        let mut has_existing_data = false;

        if let Some(val) = data.web_config {
            JsonStoreKey::web_config_v3().set(&tx, Some(val))?;
            has_existing_data = true;
        }
        if let Some(val) = data.jmdict_etag {
            StoreKey::jmdict_etag().set(&tx, Some(val))?;
            has_existing_data = true;
        }
        if let Some(val) = data.jmnedict_etag {
            StoreKey::jmnedict_etag().set(&tx, Some(val))?;
            has_existing_data = true;
        }
        if let Some(val) = data.dict_schema_ver {
            StoreKey::dict_schema_ver().set(&tx, Some(val))?;
            has_existing_data = true;
        }
        if has_existing_data {
            StoreKey::user_migration_version().set(&tx, Some(1))?;
        } else {
            StoreKey::user_migration_version().set(&tx, Some(0))?;
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
