use anyhow::Result;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::error::{FFIResult, ToUniFFIResult};
use crate::RustBackend;

#[derive(Debug, Serialize, Deserialize, JsonSchema)]
#[serde(tag = "cmd", content = "args")]
pub enum RunAppCommand {
    GetConfig(()),
    SetConfig(Option<String>),
}

#[derive(Debug, Serialize, JsonSchema)]
#[serde(tag = "cmd", content = "value")]
pub enum RunAppReturn {
    GetConfig(Option<String>),
    SetConfig(()),
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
            GetConfig(_) => serde_json::to_string(&self._get_config()?)?,
            SetConfig(args) => serde_json::to_string(&self._set_config(args)?)?,
        };

        Ok(json)
    }

    pub fn _get_config(&self) -> Result<Option<String>> {
        self.db._get_web_config_v3()
    }

    pub fn _set_config(&self, args: Option<String>) -> Result<()> {
        self.db._set_web_config_v3(args.as_ref())
    }
}
