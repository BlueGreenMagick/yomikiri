pub mod dictionary;
pub mod grammar;
pub mod run;
pub mod search;
pub mod tokenize;
mod unidic;

use crate::dictionary::Dictionary;
use lindera_tokenizer::tokenizer::Tokenizer;

pub struct SharedBackend<D: AsRef<[u8]> + 'static> {
    pub tokenizer: Tokenizer,
    pub dictionary: Dictionary<D>,
}
