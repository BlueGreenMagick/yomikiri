use crate::dictionary::Dictionary;
use crate::error::{YResult, YomikiriError};
use crate::tokenize::create_tokenizer;
use crate::utils;
use crate::SharedBackend;
use bincode::Options;
use js_sys::Uint8Array;
use std::io::Cursor;
use wasm_bindgen::prelude::*;
use yomikiri_dictionary_types::DictIndexItem;

#[wasm_bindgen(typescript_custom_section)]
const TS_CUSTOM: &'static str = r#"
export interface Token {
    text: string;
    pos: string;
    pos2: string;
    base: string;
    reading: string;
    start: number;
    children: Token[];
}

export interface GrammarInfo {
    name: string,
    short: string,
    tofugu: string,
}

export interface RawTokenizeResult {
    tokens: Token[];
    /** May be -1 if tokens is empty */
    tokenIdx: number;
    entries: string[];
    grammars: GrammarInfo[];
}

interface Backend {
    tokenize(sentence: string, charAt: number): RawTokenizeResult;
    search(term: string): string[]
}
"#;

#[wasm_bindgen]
pub struct Backend {
    inner: SharedBackend<Cursor<Vec<u8>>>,
}

#[wasm_bindgen]
impl Backend {
    #[wasm_bindgen(constructor)]
    pub fn new(index_bytes: &[u8], entries_bytes: &Uint8Array) -> YResult<Backend> {
        utils::set_panic_hook();
        utils::setup_logger();
        let tokenizer = create_tokenizer();
        let dictionary = Dictionary::try_new(index_bytes, entries_bytes)?;
        let inner = SharedBackend {
            tokenizer,
            dictionary,
        };
        Ok(Backend { inner })
    }

    #[wasm_bindgen(skip_typescript)]
    pub fn tokenize(&mut self, sentence: &str, char_at: usize) -> YResult<JsValue> {
        let result = self.inner.tokenize(sentence, char_at)?;
        serde_wasm_bindgen::to_value(&result).map_err(|e| {
            YomikiriError::ConversionError(format!(
                "Failed to serialize tokenizer result.\n{}",
                e.to_string()
            ))
        })
    }

    /// Search dictionary term and return JSON strings
    #[wasm_bindgen(skip_typescript)]
    pub fn search(&mut self, term: &str) -> YResult<JsValue> {
        let entries_json = self.inner.dictionary.search_json(term)?;
        serde_wasm_bindgen::to_value(&entries_json).map_err(|e| {
            YomikiriError::ConversionError(format!(
                "Failed to serialize dictionary entries.\n{}",
                e.to_string()
            ))
        })
    }
}

#[cfg(wasm)]
impl Dictionary<Cursor<&[u8]>> {
    // UInt8Array are copied in when passed from js
    pub fn try_new(
        index_bytes: &[u8],
        entries_bytes: &Uint8Array,
    ) -> YResult<Dictionary<Cursor<Vec<u8>>>> {
        let options = bincode::DefaultOptions::new();
        let index: Vec<DictIndexItem> = options.deserialize_from(index_bytes).map_err(|e| {
            YomikiriError::InvalidDictionaryFile(format!(
                "Failed to parse dictionary index file. {}",
                e.to_string()
            ))
        })?;
        let cursor = Cursor::new(entries_bytes.to_vec());
        Ok(Dictionary::new(index, cursor))
    }
}
