use lindera_core::error::LinderaError;
use serde::Serialize;
use std::string::FromUtf8Error;
use std::{fmt, io};

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
    #[cfg(uniffi)]
    #[error("Could not persist a temporary file: {0}")]
    PersistError(#[from] tempfile::PersistError),
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
    };
}

#[cfg(uniffi)]
err_from!(ureq::Error);
err_from!(yomikiri_dictionary::Error);
err_from!(FromUtf8Error);

#[derive(Debug, Serialize)]
#[cfg_attr(uniffi, derive(uniffi::Object))]
pub struct BackendError {
    message: String,
    details: Vec<String>,
}

impl From<anyhow::Error> for BackendError {
    fn from(value: anyhow::Error) -> Self {
        let message = value.to_string();
        let details: Vec<String> = value.chain().map(|s| s.to_string()).collect();
        BackendError { message, details }
    }
}

impl std::error::Error for BackendError {}

impl fmt::Display for BackendError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            BackendError {
                message,
                details: _details,
            } => {
                write!(f, "{}", message)
            }
        }
    }
}

impl BackendError {}

#[cfg(uniffi)]
pub use uniffimod::{FFIResult, ToUniFFIResult};

#[cfg(uniffi)]
pub mod uniffimod {
    use std::sync::Arc;

    use super::BackendError;

    pub type FFIResult<T> = Result<T, Arc<BackendError>>;

    pub trait ToUniFFIResult<T> {
        fn uniffi(self) -> FFIResult<T>;
    }

    impl<T> ToUniFFIResult<T> for Result<T, anyhow::Error> {
        fn uniffi(self) -> FFIResult<T> {
            self.map_err(|e| Arc::new(BackendError::from(e)))
        }
    }
}

#[cfg(wasm)]
pub mod wasm {
    use anyhow::Error;
    use wasm_bindgen::JsValue;

    struct WasmError(Error);

    impl From<Error> for WasmError {
        fn from(value: Error) -> Self {
            WasmError(value)
        }
    }

    impl From<WasmError> for JsValue {
        fn from(value: WasmError) -> Self {
            JsValue::from_str(&value.to_string())
        }
    }
}
