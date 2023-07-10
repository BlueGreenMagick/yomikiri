use lindera_core::error::LinderaError;
use std::io;

#[cfg(wasm)]
use wasm_bindgen::JsValue;

pub type YResult<T> = Result<T, YomikiriError>;

#[derive(Debug, thiserror::Error)]
#[cfg_attr(uniffi, derive(uniffi::Error))]
#[cfg_attr(uniffi, uniffi(flat_error))]
pub enum YomikiriError {
    #[error("{0}")]
    TokenizeError(#[from] LinderaError),
    #[error("(Unreachable) Invalid unicode byte position")]
    BytePositionError,
    #[error("{0}")]
    IOError(#[from] io::Error),
    #[error("Invalid dictionary file: {0}")]
    InvalidDictionaryFile(String),
}

impl YomikiriError {
    pub fn invalid_dictionary_file<S: Into<String>>(msg: S) -> YomikiriError {
        YomikiriError::InvalidDictionaryFile(msg.into())
    }
}

#[cfg(wasm)]
impl Into<JsValue> for YomikiriError {
    fn into(self) -> JsValue {
        JsValue::from_str(&self.to_string())
    }
}
