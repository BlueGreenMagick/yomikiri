pub mod dictionary;
pub mod error;
pub mod tokenize;
mod utils;

#[cfg(uniffi)]
mod ffi;
#[cfg(wasm)]
mod wasm;

use crate::dictionary::Dictionary;
use std::io::{Read, Seek};
use vibrato::Tokenizer;

pub struct SharedBackend<R: Read + Seek> {
    pub tokenizer: Tokenizer,
    pub dictionary: Dictionary<R>,
}

#[cfg(uniffi)]
uniffi::include_scaffolding!("uniffi_yomikiri");
