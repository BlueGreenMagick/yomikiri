pub mod entry;
pub mod error;
pub mod file;
pub mod index;
mod jmdict;
pub mod metadata;

pub use entry::{Entry, Form, PartOfSpeech, Reading, Sense};
pub use error::{Error, Result};
pub use file::{DictEntryPointer, DictTermIndex};

/** This value should be increased each time dictionary file schema is modified */
pub const SCHEMA_VER: u16 = 1;

#[cfg(feature = "uniffi")]
uniffi::setup_scaffolding!();
