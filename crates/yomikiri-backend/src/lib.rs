pub mod dictionary;
pub mod error;
pub mod grammar;
pub mod search;
pub mod tokenize;
mod unidic;
mod utils;

#[cfg(uniffi)]
mod ffi;
#[cfg(wasm)]
mod wasm;

use crate::dictionary::Dictionary;
use lindera_tokenizer::tokenizer::Tokenizer;

pub struct SharedBackend<D: AsRef<[u8]> + 'static> {
    pub tokenizer: Tokenizer,
    pub dictionary: Dictionary<D>,
}

#[cfg(uniffi)]
uniffi::setup_scaffolding!();
