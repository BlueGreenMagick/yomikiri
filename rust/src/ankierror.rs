use anki::error::SyncErrorKind;
use anki::prelude::AnkiError;

#[derive(Debug, thiserror::Error, uniffi::Error)]
#[uniffi(flat_error)]
pub enum AnkiErr {
    #[error("{0}")]
    Sql(#[from] rusqlite::Error),
    #[error("{0}")]
    SerdeJson(#[from] serde_json::Error),
    #[error("{0}")]
    FromSql(#[from] rusqlite::types::FromSqlError),
    #[error("{0}")]
    Anki(String),
    #[error("(Unreachable) AnkiManager.col is None")]
    NoCollection,
    #[error("Deck '{name}' not found")]
    DeckNotFound { name: String },
    #[error("Notetype '{name}' not found")]
    NotetypeNotFound { name: String },
    #[error("Field '{field}' not found in notetype '{notetype}'")]
    FieldNotFound { notetype: String, field: String },
    #[error("{0}")]
    AnkiWebError(String),
    #[error("{0}")]
    NetworkError(String),
    #[error("AnkiWeb ID or password was incorrect")]
    AuthFailed,
    #[error("You are not logged in")]
    NotLoggedIn,
    #[error("{message}")]
    Other { message: &'static str },
}

impl From<AnkiError> for AnkiErr {
    fn from(value: AnkiError) -> Self {
        match value {
            AnkiError::SyncError { source } => match source.kind {
                SyncErrorKind::AuthFailed => AnkiErr::AuthFailed,
                SyncErrorKind::ServerError => AnkiErr::AnkiWebError(String::from(
                    "AnkiWeb server error, please try again later",
                )),
                SyncErrorKind::ClientTooOld => AnkiErr::AnkiWebError(String::from(
                    "This app is too old and is incompatible with AnkiWeb",
                )),
                _ => AnkiErr::AnkiWebError(source.info),
            },
            AnkiError::NetworkError { source } => AnkiErr::NetworkError(source.info),
            _ => AnkiErr::Anki("".to_string()),
        }
    }
}
