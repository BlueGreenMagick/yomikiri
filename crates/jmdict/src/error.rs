use std::io;
use std::str::Utf8Error;

use thiserror::Error;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Error, Debug)]
pub enum Error {
    #[error("IO {0}")]
    Io(#[from] io::Error),
    #[error("Bincode {0}")]
    BincodeDecode(#[from] bincode::error::DecodeError),
    #[error("Xml parse error: {0}")]
    RustyXml(#[from] rustyxml::ParserError),
    #[error("Expected {expected}, encountered {actual}")]
    Unexpected {
        expected: &'static str,
        actual: String,
    },
    #[error("Invalid UTF-8")]
    Utf8Error(#[from] Utf8Error),
    #[error("Xml parse error: {0}")]
    QuickXml(#[from] quick_xml::Error),
    #[error("Invalid xml: {0}")]
    InvalidXml(String),
    #[error("{0}")]
    Other(String),
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
