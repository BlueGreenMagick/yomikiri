use chrono::Utc;
use serde::{Deserialize, Serialize};

#[derive(Debug, Eq, PartialEq, Serialize, Deserialize)]
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
}
