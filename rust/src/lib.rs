pub mod dictionary;
pub mod error;
pub mod grammar;
pub mod japanese;
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
use std::io::{Read, Seek};

pub struct SharedBackend<R: Read + Seek> {
    pub tokenizer: Tokenizer,
    pub dictionary: Dictionary<R>,
}

#[cfg(uniffi)]
uniffi::include_scaffolding!("uniffi_yomikiri");
