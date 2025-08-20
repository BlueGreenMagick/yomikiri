use anyhow::Result;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::error::{FFIResult, ToUniFFIResult};
use crate::RustBackend;

#[derive(Debug, Serialize, JsonSchema)]
pub struct RunArgAndReturnTypes {
    example: String,
}

#[derive(Debug, Serialize, Deserialize, JsonSchema)]
pub enum RunAppCommand {
    StartMigration(StartMigrationArgs),
}

#[derive(Debug, Serialize, JsonSchema)]
pub enum RunAppReturnValues {
    StartMigration(StartMigrationReturn),
}

#[derive(Debug, Serialize, Deserialize, JsonSchema)]
pub struct StartMigrationArgs {}

pub type StartMigrationReturn = ();

#[uniffi::export]
impl RustBackend {
    pub fn run_app(&self, command: String) -> FFIResult<String> {
        self._run_app(&command).uniffi()
    }
}

impl RustBackend {
    pub fn _run_app(&self, command: &str) -> Result<String> {
        use RunAppCommand::*;

        let cmd: RunAppCommand = serde_json::from_str(command)?;

        let json = match cmd {
            StartMigration(args) => serde_json::to_string(&self._run_start_migration(args)?)?,
        };

        Ok(json)
    }

    pub fn _run_start_migration(&self, args: StartMigrationArgs) -> Result<StartMigrationReturn> {
        unimplemented!()
    }
}
