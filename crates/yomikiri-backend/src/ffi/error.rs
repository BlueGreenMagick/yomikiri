use std::fmt;
use std::sync::Arc;

pub type FFIResult<T, E = FFIYomikiriError> = Result<T, E>;

#[derive(Debug, uniffi::Error)]
pub enum FFIYomikiriError {
    Error {
        /// Error message to show to the user
        message: String,
        /// Stores list of contexts, starting with `.message` and ending with leaf-most error messsage.
        details: Vec<String>,
    },
}

impl std::error::Error for FFIYomikiriError {}

impl fmt::Display for FFIYomikiriError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Error {
                message,
                details: _details,
            } => {
                write!(f, "{}", message)
            }
        }
    }
}

impl From<anyhow::Error> for FFIYomikiriError {
    fn from(value: anyhow::Error) -> Self {
        let message = value.to_string();
        let details: Vec<String> = value.chain().map(|s| s.to_string()).collect();
        Self::Error { message, details }
    }
}

trait ToUniFFIResult<T> {
    fn uniffi(self) -> Result<T, Arc<FFIYomikiriError>>;
}

impl<T> ToUniFFIResult<T> for Result<T, anyhow::Error> {
    fn uniffi(self) -> Result<T, Arc<FFIYomikiriError>> {
        self.map_err(|e| Arc::new(FFIYomikiriError::from(e)))
    }
}