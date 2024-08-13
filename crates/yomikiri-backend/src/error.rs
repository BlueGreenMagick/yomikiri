use serde::Serialize;
use std::fmt;

#[cfg(wasm)]
use wasm_bindgen::prelude::*;

#[cfg(wasm)]
pub type WasmResult<T> = Result<T, BackendError>;

#[derive(Debug, Serialize)]
#[cfg_attr(uniffi, derive(uniffi::Object))]
#[cfg_attr(wasm, wasm_bindgen(getter_with_clone))]
pub struct BackendError {
    pub message: String,
    pub details: Vec<String>,
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

    #[uniffi::export]
    impl BackendError {
        fn get_message(&self) -> String {
            self.message.to_string()
        }

        fn get_details(&self) -> Vec<String> {
            self.details.to_owned()
        }

        fn json(&self) -> String {
            serde_json::to_string(&self).unwrap()
        }
    }
}
