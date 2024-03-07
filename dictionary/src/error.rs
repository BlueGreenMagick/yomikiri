use std::io;
use std::num::TryFromIntError;

use thiserror::Error;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Error, Debug)]
pub enum Error {
    #[error("SerdeJson {0}")]
    SerdeJson(#[from] serde_json::Error),
    #[error("IO {0}")]
    Io(#[from] io::Error),
    #[error("TryFromInt {0}")]
    TryFromInt(#[from] TryFromIntError),
}
