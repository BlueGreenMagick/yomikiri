use std::error::Error;
use std::fmt::Display;

#[derive(Debug)]
pub struct UnknownValueError {
    pub encountered: String,
}

impl Display for UnknownValueError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.encountered.fmt(f)
    }
}

impl Error for UnknownValueError {}

impl UnknownValueError {
    pub fn new<S: Into<String>>(value: S) -> Self {
        UnknownValueError {
            encountered: value.into(),
        }
    }
}

pub type Result<T> = std::result::Result<T, UnknownValueError>;
