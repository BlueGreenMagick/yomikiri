use std::io;

use thiserror::Error;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Error, Debug)]
pub enum Error {
    #[error("IO {0}")]
    Io(#[from] io::Error),
    #[error("Bincode {0}")]
    Bincode(#[from] bincode::error::DecodeError),
    #[error("Xml parse error: {0}")]
    RustyXml(#[from] rustyxml::ParserError),
    #[error("Expected {expected}, encountered {actual}")]
    Unexpected {
        expected: &'static str,
        actual: String,
    },
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
