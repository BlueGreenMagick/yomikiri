use std::fmt;
use std::sync::Arc;

use yomikiri_rs::error::BackendError as RawBackendError;

pub type FFIResult<T> = Result<T, Arc<BackendError>>;

pub trait ToUniFFIResult<T> {
    fn uniffi(self) -> FFIResult<T>;
}

impl<T> ToUniFFIResult<T> for Result<T, anyhow::Error> {
    fn uniffi(self) -> FFIResult<T> {
        self.map_err(|e| Arc::new(BackendError::from(RawBackendError::from(e))))
    }
}

#[derive(uniffi::Object)]
pub struct BackendError(RawBackendError);

#[uniffi::export]
impl BackendError {
    fn get_message(&self) -> String {
        self.0.message.to_string()
    }

    fn get_details(&self) -> Vec<String> {
        self.0.details.to_owned()
    }

    fn json(&self) -> String {
        serde_json::to_string(&self.0).unwrap()
    }
}

impl From<RawBackendError> for BackendError {
    fn from(value: RawBackendError) -> Self {
        BackendError(value)
    }
}

impl fmt::Display for BackendError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        self.0.fmt(f)
    }
}

impl fmt::Debug for BackendError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        self.0.fmt(f)
    }
}
