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
    NetworkError(#[from] Box<ureq::Error>),
    #[error("[Yomikiri Dictionary Error] {0}")]
    DictionaryError(#[from] Box<yomikiri_dictionary::Error>),
    #[error("Not a valid UTF-8 string: {0}")]
    FromUTF8Error(#[from] Box<FromUtf8Error>),
    #[error("[Other Error] {0}")]
    OtherError(String),
}

macro_rules! err_from {
    ($typ:path) => {
        impl From<$typ> for YomikiriError {
            fn from(value: $typ) -> Self {
                YomikiriError::from(Box::new(value))
            }
        }
    }
}

#[cfg(uniffi)]
err_from!(ureq::Error);
err_from!(yomikiri_dictionary::Error);
err_from!(FromUtf8Error);


#[cfg(wasm)]
impl Into<JsValue> for YomikiriError {
    fn into(self) -> JsValue {
        JsValue::from_str(&self.to_string())
    }
}
