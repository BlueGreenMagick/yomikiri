use crate::dictionary::Dictionary;
use crate::error::{YResult, YomikiriError};
use crate::tokenize::create_tokenizer;
use crate::utils;
use crate::SharedBackend;
use js_sys::Uint8Array;
use std::io::Cursor;
use wasm_bindgen::prelude::*;
use yomikiri_dictionary_types::DictIndexItem;

#[wasm_bindgen(typescript_custom_section)]
const TS_TOKEN: &'static str = r#"
export interface Token {
    text: string;
    partOfSpeech: string;
    baseForm: string;
    reading: string;
    pos2: string;
    start: number;
}
"#;

#[wasm_bindgen(typescript_custom_section)]
const TS_TOKENIZE: &'static str = r#"
interface Backend {
    tokenize(sentence: string, charIdx: number): Token[]
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
    pub fn tokenize(&mut self, sentence: &str, char_idx: usize) -> YResult<JsValue> {
        let result = self.inner.tokenize(sentence, char_idx)?;
        Ok(serde_wasm_bindgen::to_value(&result).unwrap())
    }

    pub fn search(&mut self, term: &str) -> YResult<Vec<JsValue>> {
        let entries = self.inner.dictionary.search(term)?;
        Ok(entries
            .iter()
            .map(|e| serde_wasm_bindgen::to_value(e).unwrap())
            .collect())
    }
}

#[cfg(wasm)]
impl Dictionary<Cursor<&[u8]>> {
    // UInt8Array are copied in when passed from js
    pub fn try_new(
        index_bytes: &[u8],
        entries_bytes: &Uint8Array,
    ) -> YResult<Dictionary<Cursor<Vec<u8>>>> {
        let index: Vec<DictIndexItem> = bincode::deserialize_from(index_bytes)
            .map_err(|_| YomikiriError::invalid_dictionary_file("index"))?;
        let cursor = Cursor::new(entries_bytes.to_vec());
        Ok(Dictionary::new(index, cursor))
    }
}
