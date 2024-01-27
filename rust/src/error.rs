use std::io;
use vibrato::errors::VibratoError;

#[cfg(wasm)]
use wasm_bindgen::JsValue;

pub type YResult<T> = Result<T, YomikiriError>;

#[derive(Debug, thiserror::Error)]
#[cfg_attr(uniffi, derive(uniffi::Error))]
#[cfg_attr(uniffi, uniffi(flat_error))]
pub enum YomikiriError {
    #[error("[Tokenize Error] {0}")]
    TokenizeError(#[from] VibratoError),
    #[error("[Byte Position Error] (Unreachable) Invalid unicode byte position")]
    BytePositionError,
    #[error("[IOError] {0}")]
    IOError(#[from] io::Error),
    #[error("[Invalid Dictionary File] {0}")]
    InvalidDictionaryFile(String),
    #[error("[Conversion Error] {0}")]
    ConversionError(String),
    #[error("[Other Error] {0}")]
    OtherError(String),
}

#[cfg(wasm)]
impl Into<JsValue> for YomikiriError {
    fn into(self) -> JsValue {
        JsValue::from_str(&self.to_string())
    }
}
