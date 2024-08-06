use chrono::Utc;
use serde::{Deserialize, Serialize};

use crate::Result;

#[derive(Debug, Eq, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "uniffi", derive(uniffi::Record))]
pub struct DictMetadata {
    download_date: String,
    files_size: u64,
}

impl DictMetadata {
    pub fn new(files_size: u64) -> Self {
        let now = Utc::now();
        let download_date = now.to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
        Self {
            download_date,
            files_size,
        }
    }

    pub fn to_json(&self) -> Result<String> {
        let json = serde_json::to_string(&self)?;
        Ok(json)
    }
}
