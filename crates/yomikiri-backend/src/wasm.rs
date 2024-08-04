use crate::dictionary::Dictionary;
use crate::error::{YResult, YomikiriError};
use crate::tokenize::create_tokenizer;
use crate::utils;
use crate::SharedBackend;
use bincode::Options;
use flate2::bufread::GzDecoder;
use js_sys::{Array, Uint8Array};
use log::debug;
use std::io::{Cursor, Read};
use wasm_bindgen::prelude::*;
use yomikiri_dictionary::file::DictTermIndex;
use yomikiri_dictionary::file::{parse_jmdict_xml, write_entries, write_indexes};

#[wasm_bindgen(typescript_custom_section)]
const TS_CUSTOM: &'static str = r#"
export interface Token {
    text: string;
    start: number;
    children: Token[];
    pos: string;
    pos2: string;
    base: string;
    reading: string;
    conjugation: string;
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
    search(term: string, charAt: number): RawTokenizeResult
    /** 
     * from jmdict gzipped xml, creates [index, entries] bytes,
     * and updates dictionary file used in Backend.
     */
    update_dictionary(gzip: Uint8Array): [Uint8Array, Uint8Array];
}
"#;

#[wasm_bindgen]
pub struct Backend {
    inner: SharedBackend<Cursor<Vec<u8>>>,
}

#[wasm_bindgen]
impl Backend {
    #[wasm_bindgen(constructor)]
    pub fn new(index_bytes: &Uint8Array, entries_bytes: &Uint8Array) -> YResult<Backend> {
        utils::set_panic_hook();
        utils::setup_logger();
        let tokenizer = create_tokenizer();
        let dictionary = Dictionary::try_new(&index_bytes.to_vec(), entries_bytes.to_vec())?;
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
            YomikiriError::ConversionError(format!("Failed to serialize tokenizer result.\n{}", e))
        })
    }

    /// dictionary search
    #[wasm_bindgen(skip_typescript)]
    pub fn search(&mut self, term: &str, char_at: usize) -> YResult<JsValue> {
        let result = self.inner.search(term, char_at)?;
        serde_wasm_bindgen::to_value(&result).map_err(|e| {
            YomikiriError::ConversionError(format!("Failed to serialize tokenizer result.\n{}", e))
        })
    }

    /// Generates new yomikiri dictionary files from gzipped jmdict bytes,
    /// and replaces dictionary used in Backend.
    ///
    /// Returns [.yomikiriindex, .yomikiridict] bytes as [UInt8Array, UInt8Array]
    #[wasm_bindgen(skip_typescript)]
    pub fn update_dictionary(&mut self, gzipped_jmdict: &Uint8Array) -> YResult<JsValue> {
        let gzipped = gzipped_jmdict.to_vec();
        let mut decoder = GzDecoder::new(&gzipped[..]);
        let mut xml = String::with_capacity(72 * 1024 * 1024);
        decoder.read_to_string(&mut xml)?;
        std::mem::drop(decoder);
        std::mem::drop(gzipped);
        debug!("unzipped jmdict file");

        let entries = parse_jmdict_xml(&xml)?;
        std::mem::drop(xml);
        debug!("parsed jmdict file");

        let mut entries_bytes: Vec<u8> = Vec::with_capacity(15 * 1024 * 1024);
        let term_indexes = write_entries(&mut entries_bytes, &entries)?;
        let entries_array = Uint8Array::from(&entries_bytes[..]);

        let mut index_bytes: Vec<u8> = Vec::with_capacity(15 * 1024 * 1024);
        write_indexes(&mut index_bytes, &term_indexes)?;
        let index_array = Uint8Array::from(&index_bytes[..]);

        let tuple = Array::new_with_length(2);
        tuple.set(0, index_array.into());
        tuple.set(1, entries_array.into());

        let dict = Dictionary::try_new(&index_bytes, entries_bytes)?;
        self.inner.dictionary = dict;
        Ok(tuple.into())
    }
}

impl Dictionary<Cursor<&[u8]>> {
    // UInt8Array are copied in when passed from js
    pub fn try_new(
        index_bytes: &[u8],
        entries_bytes: Vec<u8>,
    ) -> YResult<Dictionary<Cursor<Vec<u8>>>> {
        let options = bincode::DefaultOptions::new();
        let index: Vec<DictTermIndex> = options.deserialize_from(index_bytes).map_err(|e| {
            YomikiriError::InvalidDictionaryFile(format!(
                "Failed to parse dictionary index file. {}",
                e
            ))
        })?;
        let cursor = Cursor::new(entries_bytes);
        Ok(Dictionary::new(index, cursor))
    }
}
