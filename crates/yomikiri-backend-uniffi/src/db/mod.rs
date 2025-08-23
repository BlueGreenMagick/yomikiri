mod migrate;
mod store;

use std::sync::{Arc, Mutex, MutexGuard};

use anyhow::{Context, Result};
use rusqlite::trace::{TraceEvent, TraceEventCodes};
use rusqlite::{CachedStatement, Connection};

use crate::error::{FFIResult, ToUniFFIResult};

const VERSION: u16 = 1;

#[uniffi::export]
#[allow(non_snake_case)]
pub fn UNIFFI_RUST_DATABASE_VERSION() -> u16 {
    VERSION
}

#[derive(uniffi::Object)]
pub struct RustDatabase {
    db: Mutex<Connection>,
}

#[uniffi::export]
impl RustDatabase {
    #[uniffi::constructor]
    pub fn uniffi_open(path: String) -> FFIResult<Arc<RustDatabase>> {
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

    pub fn uniffi_get_version(&self) -> FFIResult<u32> {
        get_version(&self.conn()).uniffi()
    }
}

impl RustDatabase {
    fn conn(&self) -> MutexGuard<'_, Connection> {
        self.db.lock().unwrap()
    }
}

trait ConnectionTrait {
    fn sql(&self, sql: &str) -> Result<CachedStatement<'_>>;
}

impl ConnectionTrait for Connection {
    fn sql(&self, sql: &str) -> Result<CachedStatement<'_>> {
        self.prepare_cached(sql)
            .context("Failed to prepare SQL statement")
    }
}

fn get_version(db: &Connection) -> Result<u32> {
    db.sql("SELECT user_version FROM pragma_user_version")?
        .query_row([], |r| r.get(0))
        .map_err(Into::into)
}

fn log_trace(ev: TraceEvent<'_>) {
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
