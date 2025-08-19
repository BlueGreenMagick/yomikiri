use schemars::JsonSchema;
use serde::Serialize;

use crate::error::FFIResult;
use crate::RustBackend;

#[derive(Debug, Serialize, JsonSchema)]
pub struct RunArgAndReturnTypes {
    example: String,
}

#[derive(Debug, Serialize, JsonSchema)]
pub enum RunAppCommand {
    StartMigration(StartMigrationArgs),
}

#[derive(Debug, Serialize, JsonSchema)]
pub struct StartMigrationArgs {}

#[uniffi::export]
impl RustBackend {
    pub fn runApp(&self, command: String) -> FFIResult<String> {}
}

impl RustBackend {
    pub fn _runApp(&self, command: &str) -> Result<String> {
        let cmd: RunAppCommand = serde_json::from_str(command)?;
        match cmd {
            StartMigration(args) => self._runStartMigration(args),
        }
    }

    pub fn _runStartMigration(args: StartMigrationArgs) -> Result<String> {}
}
