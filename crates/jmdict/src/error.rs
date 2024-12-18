use std::io;
use std::str::Utf8Error;

use thiserror::Error;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Error, Debug)]
pub enum Error {
    #[error("IO {0}")]
    Io(#[from] io::Error),
    #[error("Expected {expected}, encountered {actual}")]
    Unexpected { expected: String, actual: String },
    #[error("Invalid UTF-8")]
    Utf8Error(#[from] Utf8Error),
    #[error("Xml parse error: {0}")]
    QuickXml(#[from] quick_xml::Error),
    #[error("Invalid xml: {0}")]
    InvalidXml(String),
    #[error("Attribute error {0}")]
    AttributeError(#[from] quick_xml::events::attributes::AttrError),
    #[error("{0}")]
    Other(String),
    #[error("(Unreachable) Error while unescaping xml entities: {0}")]
    EscapeError(#[from] quick_xml::escape::EscapeError),
    #[error("Entry has multiple ids: {0}")]
    MultipleEntryIds(u32),
    #[error("Entry has no id, at pos: {0}")]
    NoEntryId(u64),
}

impl From<String> for Error {
    fn from(value: String) -> Self {
        Self::Other(value)
    }
}

impl From<&str> for Error {
    fn from(value: &str) -> Self {
        Self::Other(value.into())
    }
}
