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
    #[error("Bincode {0}")]
    Bincode(#[from] bincode::Error),
    #[error("JMDict parse error {0}")]
    JMDict(#[from] yomikiri_jmdict::Error),
    #[error("FST error: {0}")]
    Fst(#[from] fst::Error),
    #[error("Out of range")]
    OutOfRange,
}
