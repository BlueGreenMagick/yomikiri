pub mod dictionary;
pub mod entry;
pub mod error;
pub mod index;
pub mod jagged_array;
mod jmdict;
pub mod metadata;

pub use entry::{Entry, Form, PartOfSpeech, Reading, Sense};
pub use error::{Error, Result};

/** This value should be increased each time dictionary file schema is modified */
pub const SCHEMA_VER: u16 = 3;

pub const DICT_FILENAME: &'static str = "english.yomikiridict";
pub const DICT_METADATA_FILENAME: &'static str = "dictionary-metadata.json";

#[cfg(feature = "uniffi")]
uniffi::setup_scaffolding!();
