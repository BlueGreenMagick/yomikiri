use anyhow::Result;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::db::migrate::{UserMigrationArgs, UserMigrationState};
use crate::db::JsonStoreKey;
use crate::error::{FFIResult, ToUniFFIResult};
use crate::RustBackend;

#[derive(Debug, Serialize, Deserialize, JsonSchema)]
#[serde(tag = "type", content = "args")]
pub enum AppCommand {
    GetConfig(()),
    SetConfig(Option<String>),
    UserMigrateStep(UserMigrationArgs),
}

#[derive(Debug, Serialize, JsonSchema)]
#[serde(tag = "type", content = "result")]
pub enum AppCommandResultSpec {
    GetConfig(Option<String>),
    SetConfig(()),
    UserMigrateStep(UserMigrationState),
}

#[uniffi::export]
impl RustBackend {
    pub fn uniffi_invoke_app(&self, command: String) -> FFIResult<String> {
        self.invoke_app(&command).uniffi()
    }
}

impl RustBackend {
    pub fn invoke_app(&self, command: &str) -> Result<String> {
        use AppCommand::*;

        let cmd: AppCommand = serde_json::from_str(command)?;

        let json = match cmd {
            GetConfig(_) => serde_json::to_string(&self.get_config()?)?,
            SetConfig(args) => serde_json::to_string(&self.set_config(args)?)?,
            UserMigrateStep(args) => serde_json::to_string(&self.db.user_migrate_step(args)?)?,
        };

        Ok(json)
    }

    pub fn get_config(&self) -> Result<Option<String>> {
        JsonStoreKey::web_config_v4().get(&self.db.conn())
    }

    pub fn set_config(&self, args: Option<String>) -> Result<()> {
        JsonStoreKey::web_config_v4().set(&self.db.conn(), args)
    }
}
