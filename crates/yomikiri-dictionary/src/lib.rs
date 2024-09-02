pub mod dictionary;
pub mod entry;
pub mod error;
pub mod index;
pub mod jagged_array;
pub mod jmdict;

pub use entry::{Entry, Kanji, PartOfSpeech, Reading, Sense};
pub use error::{Error, Result};

/** This value should be increased each time dictionary file schema is modified */
pub const SCHEMA_VER: u16 = 3;

pub const DICT_FILENAME: &str = "english.yomikiridict";

#[cfg(feature = "uniffi")]
uniffi::setup_scaffolding!();
