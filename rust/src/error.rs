use lindera_core::error::LinderaError;
use std::io;
use std::string::FromUtf8Error;

#[cfg(wasm)]
use wasm_bindgen::JsValue;

pub type YResult<T> = Result<T, YomikiriError>;

#[derive(Debug, thiserror::Error)]
#[cfg_attr(uniffi, derive(uniffi::Error))]
#[cfg_attr(uniffi, uniffi(flat_error))]
pub enum YomikiriError {
    #[error("[Tokenize Error] {0}")]
    TokenizeError(#[from] LinderaError),
    #[error("[Byte Position Error] (Unreachable) Invalid unicode byte position")]
    BytePositionError,
    #[error("[IOError] {0}")]
    IOError(#[from] io::Error),
    #[error("[Invalid Dictionary File] {0}")]
    InvalidDictionaryFile(String),
    #[error("[Conversion Error] {0}")]
    ConversionError(String),
    #[cfg(uniffi)]
    #[error("[NetworkError] {0}")]
    NetworkError(#[from] ureq::Error),
    #[error("[JMDict Error] {0}")]
    JMDictError(#[from] yomikiri_jmdict::Error),
    #[error("[Yomikiri Dictionary Error] {0}")]
    DictionaryError(#[from] yomikiri_dictionary::Error),
    #[error("Not a valid UTF-8 string: {0}")]
    FromUTF8Error(#[from] FromUtf8Error),
    #[error("[Other Error] {0}")]
    OtherError(String),
}

#[cfg(wasm)]
impl Into<JsValue> for YomikiriError {
    fn into(self) -> JsValue {
        JsValue::from_str(&self.to_string())
    }
}
