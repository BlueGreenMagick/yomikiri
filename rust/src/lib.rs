mod dictionary;
mod error;
mod tokenizer;
mod utils;

#[cfg(uniffi)]
mod ffi;
#[cfg(wasm)]
mod wasm;

use crate::dictionary::Dictionary;
use lindera_tokenizer::tokenizer::Tokenizer;
use std::io::{Read, Seek};

pub struct SharedBackend<R: Read + Seek> {
    pub(crate) tokenizer: Tokenizer,
    pub(crate) dictionary: Dictionary<R>,
}

#[cfg(uniffi)]
uniffi::include_scaffolding!("uniffi_yomikiri");
