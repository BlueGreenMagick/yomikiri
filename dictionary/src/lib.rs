pub mod entry;
pub mod error;
pub mod file;
mod jmdict;

#[cfg(wasm)]
mod wasm;

pub use entry::{Entry, Form, PartOfSpeech, Reading, Sense};
pub use error::{Error, Result};
pub use file::{DictEntryIndex, DictTermIndex};
