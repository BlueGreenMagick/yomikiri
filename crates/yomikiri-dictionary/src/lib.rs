pub mod dictionary;
pub mod entry;
pub mod error;
pub mod index;
pub mod jagged_array;
pub mod jmdict;
pub mod jmnedict;
pub mod meaning;
mod utils;

pub use entry::{Kanji, PartOfSpeech, Reading, Sense, WordEntry};
pub use error::{Error, Result};

/** This value should be increased each time dictionary file schema is modified */
pub const SCHEMA_VER: u16 = 4;

pub const DICT_FILENAME: &str = "english.yomikiridict";
