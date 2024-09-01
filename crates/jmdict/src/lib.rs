pub mod error;
pub mod jmdict;
pub mod jmnedict;
mod utils;
mod xml;

pub use crate::error::Error;
pub use jmdict::parse_jmdict_xml;

pub type Result<T> = core::result::Result<T, Error>;
