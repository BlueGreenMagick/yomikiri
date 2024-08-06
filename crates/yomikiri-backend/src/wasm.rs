use crate::dictionary::Dictionary;
use crate::error::{YResult, YomikiriError};
use crate::tokenize::create_tokenizer;
use crate::utils;
use crate::SharedBackend;

use flate2::bufread::GzDecoder;
use js_sys::Uint8Array;
use log::debug;
use serde::Serialize;
use std::io::{Cursor, Read};
use wasm_bindgen::prelude::*;
use yomikiri_dictionary::file::{parse_jmdict_xml, write_entries, write_indexes};
use yomikiri_dictionary::index::DictIndex;
use yomikiri_dictionary::metadata::DictMetadata;

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

export interface DictUpdateResult {
    entry_bytes: Uint8Array;
    index_bytes: Uint8Array;
    metadata: DictMetadata;
}

export interface DictMetadata {
    download_date: string;
    files_size: number;
    user_download: boolean;
}

interface Backend {
    tokenize(sentence: string, charAt: number): RawTokenizeResult;
    search(term: string, charAt: number): RawTokenizeResult;
    /** 
     * from jmdict gzipped xml, creates dictionary file bytearray,
     * and updates dictionary file used in Backend.
     */
    update_dictionary(gzip: Uint8Array): DictUpdateResult;
}
"#;

#[derive(Serialize)]
struct DictUpdateResult {
    #[serde(with = "serde_wasm_bindgen::preserve")]
    entry_bytes: Uint8Array,
    #[serde(with = "serde_wasm_bindgen::preserve")]
    index_bytes: Uint8Array,
    metadata: DictMetadata,
}

#[wasm_bindgen]
pub struct Backend {
    inner: SharedBackend<Vec<u8>, Cursor<Vec<u8>>>,
}

#[wasm_bindgen]
impl Backend {
    #[wasm_bindgen(constructor)]
    pub fn new(index_bytes: &Uint8Array, entries_bytes: &Uint8Array) -> YResult<Backend> {
        utils::set_panic_hook();
        utils::setup_logger();
        let tokenizer = create_tokenizer();
        let dictionary = Dictionary::try_new(index_bytes.to_vec(), entries_bytes.to_vec())?;
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

        let files_size = entries_bytes.len() + index_bytes.len();

        let metadata = DictMetadata::new(files_size as u64, true);

        let result = DictUpdateResult {
            entry_bytes: entries_array,
            index_bytes: index_array,
            metadata,
        };

        let dict = Dictionary::try_new(index_bytes, entries_bytes)?;
        self.inner.dictionary = dict;
        serde_wasm_bindgen::to_value(&result).map_err(|e| {
            YomikiriError::ConversionError(format!("Failed to serialize tokenizer result.\n{}", e))
        })
    }
}

impl Dictionary<Vec<u8>, Cursor<&[u8]>> {
    // UInt8Array are copied in when passed from js
    pub fn try_new(
        index_bytes: Vec<u8>,
        entries_bytes: Vec<u8>,
    ) -> YResult<Dictionary<Vec<u8>, Cursor<Vec<u8>>>> {
        let index = DictIndex::try_from_source(index_bytes)?;
        let cursor = Cursor::new(entries_bytes);
        Ok(Dictionary::new(index, cursor))
    }
}
