use anyhow::Result;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::error::{FFIResult, ToUniFFIResult};
use crate::RustBackend;

#[derive(Debug, Serialize, Deserialize, JsonSchema)]
pub enum RunAppCommand {
    GetConfig(GetConfigArgs),
    SetConfig(SetConfigArgs),
}

#[derive(Debug, Serialize, JsonSchema)]
pub enum RunAppReturn {
    GetConfig(GetConfigReturn),
    SetConfig(SetConfigReturn),
}

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
            GetConfig(args) => serde_json::to_string(&self._get_config(args)?)?,
            SetConfig(args) => serde_json::to_string(&self._set_config(args)?)?,
        };

        Ok(json)
    }

    pub fn _get_config(&self, _args: GetConfigArgs) -> Result<GetConfigReturn> {
        self.db._get_web_config_v3()
    }

    pub fn _set_config(&self, args: SetConfigArgs) -> Result<SetConfigReturn> {
        self.db._set_web_config_v3(args.config.as_ref())
    }
}

#[derive(Debug, Serialize, Deserialize, JsonSchema)]
pub struct GetConfigArgs {}

pub type GetConfigReturn = Option<String>;

#[derive(Debug, Serialize, Deserialize, JsonSchema)]
pub struct SetConfigArgs {
    config: Option<String>,
}

pub type SetConfigReturn = ();
