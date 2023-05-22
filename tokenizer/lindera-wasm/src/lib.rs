#![allow(non_snake_case)]

mod utils;

#[cfg(feature = "uniffi")]
use std::sync::Arc;

use lindera::dictionary::DictionaryConfig;
use lindera::mode::Mode;
use lindera::tokenizer::{Tokenizer as LTokenizer, TokenizerConfig};
use lindera::{DictionaryKind, LinderaResult, Token as LToken};
#[cfg(feature = "wasm")]
use {serde::Serialize, wasm_bindgen::prelude::*};

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[cfg_attr(feature = "uniffi", derive(uniffi::Object))]
pub struct Tokenizer {
    tokenizer: LTokenizer,
}

#[cfg_attr(feature = "wasm", derive(Serialize))]
#[cfg_attr(feature = "uniffi", derive(uniffi::Record))]
pub struct Token {
    pub text: String,
    /// defaults to `UNK`
    pub partOfSpeech: String,
    /// defaults to `text`
    pub baseForm: String,
    /// defaults to `*`
    pub reading: String,
}

#[cfg(feature = "wasm")]
#[wasm_bindgen(typescript_custom_section)]
const TS_TOKEN: &'static str = r#"
export interface Token {
    text: string;
    partOfSpeech: string;
    baseForm: string;
    reading: string;
}
"#;

fn get_value_from_detail<S: Into<String>>(
    details: &Option<Vec<&str>>,
    index: usize,
    default: S,
) -> String {
    details
        .as_deref()
        .map(|d| d.get(index).map(|s| s.to_string()))
        .flatten()
        .unwrap_or_else(|| default.into())
}

impl From<&mut LToken<'_>> for Token {
    fn from(tok: &mut LToken) -> Self {
        let text = tok.text.to_string();
        let details = tok.get_details();

        Token {
            baseForm: get_value_from_detail(&details, 6, &text),
            reading: get_value_from_detail(&details, 7, "*"),
            partOfSpeech: get_value_from_detail(&details, 0, "UNK"),
            text: text,
        }
    }
}

impl Tokenizer {
    pub fn tokenize_inner<'a>(&self, sentence: &'a str) -> LinderaResult<Vec<Token>> {
        let mut tokens = self.tokenizer.tokenize(sentence)?;
        let result = tokens.iter_mut().map(Token::from).collect();
        Ok(result)
    }

    pub fn create() -> Tokenizer {
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
        Tokenizer { tokenizer }
    }
}

#[cfg(feature = "wasm")]
#[wasm_bindgen]
impl Tokenizer {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Tokenizer {
        utils::set_panic_hook();
        Tokenizer::create()
    }

    #[wasm_bindgen(skip_typescript)]
    pub fn tokenize(&self, sentence: &str) -> Vec<JsValue> {
        // let start = utils::time_now();
        let val = self
            .tokenize_inner(sentence)
            .unwrap()
            .iter()
            .map(|s| serde_wasm_bindgen::to_value(s).unwrap())
            .collect();
        // let end = utils::time_now();
        // utils::log!("finally: {}", end - start);
        return val;
    }
}

#[cfg(feature = "wasm")]
#[wasm_bindgen(typescript_custom_section)]
const TS_TOKENIZE: &'static str = r#"
interface Tokenizer {
    tokenize(sentence: string): Token[]
}
"#;

#[cfg(feature = "uniffi")]
#[uniffi::export]
impl Tokenizer {
    #[uniffi::constructor]
    fn new() -> Arc<Tokenizer> {
        let this = Tokenizer::create();
        Arc::new(this)
    }

    fn tokenize(&self, sentence: String) -> Vec<Token> {
        self.tokenize_inner(&sentence).unwrap()
    }
}

#[cfg(feature = "uniffi")]
uniffi::include_scaffolding!("uniffi_lindera");

#[cfg(test)]
mod tests {
    use super::Tokenizer;

    #[test]
    fn print_details() {
        let tokenizer = Tokenizer::create();
        let tokens = tokenizer
            .tokenizer
            .tokenize("そのいじらしい姿が可愛かったので、hello.")
            .unwrap();
        for mut token in tokens {
            let text = token.text.to_string();
            println!("{}: {:?}", text, token.get_details());
        }
    }
}

#[cfg(test)]
#[cfg(feature = "wasm")]
mod wasm_tests {
    use super::Tokenizer;
    use wasm_bindgen_test::wasm_bindgen_test;

    #[wasm_bindgen_test]
    fn test_tokenize() {
        wasm_bindgen_test::wasm_bindgen_test_configure!(run_in_browser);

        let tokenizer = Tokenizer::new();
        tokenizer.tokenize_inner("関西国際空港限定トートバッグ");
    }
}
