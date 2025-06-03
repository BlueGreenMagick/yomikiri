use std::sync::{Arc, Mutex};

use anyhow::Context;
use rusqlite::trace::{TraceEvent, TraceEventCodes};
use rusqlite::Connection;

use crate::error::{FFIResult, ToUniFFIResult};

const VERSION: u16 = 1;

#[uniffi::export]
#[allow(non_snake_case)]
pub fn RUST_DATABASE_VERSION() -> u16 {
    VERSION
}

#[derive(uniffi::Object)]
pub struct RustDatabase {
    db: Mutex<Connection>,
}

#[uniffi::export]
impl RustDatabase {
    #[uniffi::constructor]
    pub fn open(path: String) -> FFIResult<Arc<RustDatabase>> {
        let db = Connection::open(&path)
            .context("Failed to open SQL database file")
            .uniffi()?;
        db.trace_v2(TraceEventCodes::all(), Some(log_trace));
        db.busy_timeout(std::time::Duration::from_secs(0))
            .context("SQL busy timeout exceeded")
            .uniffi()?;
        let locked = Mutex::new(db);
        let this = RustDatabase { db: locked };
        Ok(Arc::new(this))
    }
}

fn log_trace<'s>(ev: TraceEvent<'s>) {
    match ev {
        TraceEvent::Stmt(s, text) => {
            log::debug!("[SQL] STMT: {} ; {}", s.sql(), text)
        }
        TraceEvent::Profile(s, dur) => {
            log::debug!("[SQL] PROFILE: ({}ms) {}", dur.as_millis(), s.sql(),)
        }
        TraceEvent::Row(s) => {
            log::debug!("[SQL] ROW: {}", s.sql())
        }
        TraceEvent::Close(s) => {
            log::debug!("[SQL] CLOSE: {}", s.db_filename().unwrap_or("<none>"))
        }
        _ => {
            log::debug!("[SQL] UNKNOWN EVENT")
        }
    }
}
