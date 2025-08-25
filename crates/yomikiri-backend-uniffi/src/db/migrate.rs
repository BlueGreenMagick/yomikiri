use anyhow::Result;
use rusqlite::Connection;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::db::store::StoreKey;
use crate::db::{JsonStoreKey, RustDatabase};
use crate::error::{FFIResult, ToUniFFIResult};

/// Whenever user data requires migration:
/// 1) increment this value
/// 2) Add prev_version -> curr_version migration step
/// 3) Modify v0 -> version migration step
const USER_MIGRATION_VERSION: u16 = 2;

#[derive(Debug, Serialize, JsonSchema)]
pub enum UserMigrationState {
    V0(UserMigrationV0State),
    V1(UserMigrationV1State),
    V2(UserMigrationV1State),
}

#[derive(Debug, Serialize, Deserialize, JsonSchema)]
pub enum UserMigrationArgs {
    Start(()),
    FromV0(()),
    FromV1(UserMigrateFromV1Args),
}

#[derive(Debug, Serialize, JsonSchema)]
pub struct UserMigrationV0State {}

#[derive(Debug, Serialize, JsonSchema)]
pub struct UserMigrationV1State {
    config: Option<String>,
}

#[derive(Debug, Serialize, JsonSchema)]
pub struct UserMigrationV2State {}

#[derive(Debug, Serialize, Deserialize, JsonSchema)]
pub struct UserMigrateFromV1Args {
    config: String,
}

#[uniffi::export]
impl RustDatabase {
    pub fn uniffi_requires_user_migration(&self) -> FFIResult<bool> {
        self.requires_user_migration().uniffi()
    }
}

impl RustDatabase {
    fn requires_user_migration(&self) -> Result<bool> {
        let conn = self.conn();
        let version = StoreKey::user_migration_version().get(&conn)?;
        Ok(version == Some(USER_MIGRATION_VERSION))
    }

    pub fn user_migrate_step(&self, args: UserMigrationArgs) -> Result<UserMigrationState> {
        use UserMigrationArgs::*;

        match args {
            Start(_) => (),
            FromV0(_) => self.user_migrate_v0_to_v2()?,
            FromV1(args) => self.user_migrate_v1_to_v2(args)?,
        };
        self.get_user_migration_state()
    }

    fn get_user_migration_state(&self) -> Result<UserMigrationState> {
        use UserMigrationState::*;

        let mut conn = self.conn();
        let tx = conn.transaction()?;
        let version = StoreKey::user_migration_version().get(&tx)?.unwrap_or(0);
        let state = match version {
            0 => V0(UserMigrationV0State {}),
            _ => unimplemented!(),
        };
        Ok(state)
    }

    fn user_migrate_v0_to_v2(&self) -> Result<()> {
        let mut conn = self.conn();
        let tx = conn.transaction()?;
        if !user_migration_version_is(&tx, 0)? {
            return Ok(());
        }

        StoreKey::user_migration_version().set(&tx, Some(2))?;
        Ok(())
    }

    fn user_migrate_v1_to_v2(&self, args: UserMigrateFromV1Args) -> Result<()> {
        let mut conn = self.conn();
        let tx = conn.transaction()?;
        if !user_migration_version_is(&tx, 1)? {
            return Ok(());
        }

        let version = StoreKey::user_migration_version().get(&tx)?;
        if version != Some(1) {
            return Ok(());
        }

        JsonStoreKey::web_config_v4().set(&tx, Some(args.config))?;
        StoreKey::user_migration_version().set(&tx, Some(2))?;
        Ok(())
    }
}

fn user_migration_version_is(conn: &Connection, version: u16) -> Result<bool> {
    let current = StoreKey::user_migration_version().get(conn)?.unwrap_or(0);
    Ok(current == version)
}
