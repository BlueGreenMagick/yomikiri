use std::fmt;

use serde::Serialize;
use wasm_bindgen::prelude::*;

pub type WasmResult<T> = Result<T, BackendError>;

#[derive(Debug, Serialize)]
#[wasm_bindgen(getter_with_clone)]
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
        let BackendError {
            message,
            details: _details,
        } = self;
        write!(f, "{}", message)
    }
}
