pub mod entry;
pub mod error;
pub mod file;
mod jmdict;

pub use entry::{Entry, Form, PartOfSpeech, Reading, Sense};
pub use error::{Error, Result};
pub use file::{DictEntryIndex, DictTermIndex};
