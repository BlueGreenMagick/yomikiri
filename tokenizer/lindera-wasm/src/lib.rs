mod utils;

use wasm_bindgen::prelude::*;
use lindera::tokenizer::{Tokenizer as LTokenizer, TokenizerConfig};
use lindera::{LinderaResult, DictionaryKind};
use lindera::dictionary::{DictionaryConfig};
use lindera::mode::Mode;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
pub struct Tokenizer {
    tokenizer: LTokenizer
}


#[wasm_bindgen]
impl Tokenizer {
    
    #[wasm_bindgen(constructor)]
    pub fn new() -> Tokenizer {
        utils::set_panic_hook();

        let dictionary = DictionaryConfig {
            kind: Some(DictionaryKind::IPADIC),
            path: None,
        };
        let config = TokenizerConfig {
            dictionary,
            user_dictionary: None,
            mode: Mode::Normal,
        };
        let tokenizer = LTokenizer::from_config(config).unwrap();
        Tokenizer { 
            tokenizer
        }
    }

    pub fn tokenize(&self, sentence: &str) -> Vec<i32> {
        self.tokenize_inner(sentence).unwrap()
    }

    fn tokenize_inner(&self, sentence: &str) -> LinderaResult<Vec<i32>> {
        let tokens = self.tokenizer.tokenize(sentence)?;

        let mut result = Vec::with_capacity(tokens.len());
        let mut chars = sentence.chars();
        let mut char_idx = 0;
        let mut byte_idx = 0;
        for token in tokens {
            let start = token.byte_start;
            while byte_idx < start {
                let bytes = chars.next().unwrap().len_utf8();
                byte_idx += bytes;
                char_idx += 1;
            }
            result.push(char_idx);
        }
        Ok(result)
    }
}

#[cfg(test)]
mod tests {
    use super::Tokenizer;
    use wasm_bindgen_test::wasm_bindgen_test;

    #[wasm_bindgen_test]
    fn test_tokenize() {
        wasm_bindgen_test::wasm_bindgen_test_configure!(run_in_browser);
        
        let tokenizer = Tokenizer::new();
        tokenizer.tokenize("関西国際空港限定トートバッグ");
    }
}