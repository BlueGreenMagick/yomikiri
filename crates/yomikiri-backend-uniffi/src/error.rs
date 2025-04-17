use serde::Serialize;
use std::fmt;
use std::sync::Arc;

pub type FFIResult<T> = Result<T, Arc<BackendError>>;

pub trait ToUniFFIResult<T> {
    fn uniffi(self) -> FFIResult<T>;
}

impl<T> ToUniFFIResult<T> for Result<T, anyhow::Error> {
    fn uniffi(self) -> FFIResult<T> {
        self.map_err(|e| Arc::new(BackendError::from(e)))
    }
}

#[derive(Debug, Serialize, uniffi::Object)]
pub struct BackendError {
    pub message: String,
    pub details: Vec<String>,
}

impl std::error::Error for BackendError {}

impl From<anyhow::Error> for BackendError {
    fn from(value: anyhow::Error) -> Self {
        let message = value.to_string();
        let details: Vec<String> = value.chain().map(|s| s.to_string()).collect();
        BackendError { message, details }
    }
}

#[uniffi::export]
impl BackendError {
    fn retrieve_message(&self) -> String {
        self.message.to_string()
    }

    fn retrieve_details(&self) -> Vec<String> {
        self.details.to_owned()
    }

    fn json(&self) -> String {
        serde_json::to_string(&self).unwrap()
    }
}

impl fmt::Display for BackendError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let BackendError {
            message,
            details: _details,
        } = self;
        write!(f, "{}", message)
    }
}
