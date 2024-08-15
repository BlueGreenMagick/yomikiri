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
    #[error("Bincode encode: {0}")]
    BincodeEncode(#[from] bincode::error::EncodeError),
    #[error("Bincode decode: {0}")]
    BincodeDecode(#[from] bincode::error::DecodeError),
    #[error("JMDict parse error {0}")]
    JMDict(#[from] yomikiri_jmdict::Error),
    #[error("FST error: {0}")]
    Fst(#[from] fst::Error),
    #[error("Out of range")]
    OutOfRange,
    #[error("Could not reserve space for vector")]
    CouldNotReserve(#[from] std::collections::TryReserveError),
}
