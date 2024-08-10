use serde::Serialize;
use std::fmt;

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

#[cfg(wasm)]
pub use wasmmod::WasmResult;

#[cfg(wasm)]
pub mod wasmmod {
    use super::BackendError;

    use wasm_bindgen::JsValue;

    pub type WasmResult<T> = Result<T, BackendError>;

    impl From<BackendError> for JsValue {
        fn from(value: BackendError) -> Self {
            serde_wasm_bindgen::to_value(&value)
                .unwrap_or(JsValue::from_str("Failed to serialize BackendError to JSON"))
        }
    }
}

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
