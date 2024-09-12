use crate::dictionary::Dictionary;
use crate::error::WasmResult;
use crate::tokenize::create_tokenizer;
use crate::utils;
use crate::SharedBackend;

use anyhow::{anyhow, Context};
use flate2::bufread::GzDecoder;
use js_sys::Uint8Array;
use log::debug;
use serde::Serialize;
use std::io::Read;
use wasm_bindgen::prelude::*;
use yomikiri_dictionary::dictionary::DictionaryView;
use yomikiri_dictionary::jmdict::parse_jmdict_xml;
use yomikiri_dictionary::SCHEMA_VER;

#[wasm_bindgen(typescript_custom_section)]
const TS_CUSTOM: &'static str = r#"
export interface DictUpdateResult {
    dict_bytes: Uint8Array;
}

interface Backend {
    tokenize(sentence: string, charAt: number): TokenizeResult;
    search(term: string, charAt: number): TokenizeResult;
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
    dict_bytes: Uint8Array,
}

#[wasm_bindgen]
pub struct Backend {
    inner: SharedBackend<Vec<u8>>,
}

#[wasm_bindgen]
impl Backend {
    #[wasm_bindgen(constructor)]
    pub fn new(dict_bytes: &Uint8Array) -> WasmResult<Backend> {
        utils::set_panic_hook();
        utils::setup_logger();
        let tokenizer = create_tokenizer();
        let dictionary =
            Dictionary::try_new(dict_bytes.to_vec()).context("Failed to create dictionary")?;
        let inner = SharedBackend {
            tokenizer,
            dictionary,
        };
        Ok(Backend { inner })
    }

    #[wasm_bindgen(skip_typescript)]
    pub fn tokenize(&mut self, sentence: &str, char_at: usize) -> WasmResult<JsValue> {
        let result = self
            .inner
            .tokenize(sentence, char_at)
            .context("Error occured while tokenizing sentence")?;
        serialize_result(&result)
    }

    /// dictionary search
    #[wasm_bindgen(skip_typescript)]
    pub fn search(&mut self, term: &str, char_at: usize) -> WasmResult<JsValue> {
        let result = self
            .inner
            .search(term, char_at)
            .context("Error occured while searching")?;
        serialize_result(&result)
    }

    /// Generates new yomikiri dictionary files from gzipped jmdict bytes,
    /// and replaces dictionary used in Backend.
    ///
    /// Returns [.yomikiriindex, .yomikiridict] bytes as [UInt8Array, UInt8Array]
    #[wasm_bindgen(skip_typescript)]
    pub fn update_dictionary(&mut self, gzipped_jmdict: &Uint8Array) -> WasmResult<JsValue> {
        let gzipped = gzipped_jmdict.to_vec();
        let mut decoder = GzDecoder::new(&gzipped[..]);
        let mut xml = String::with_capacity(72 * 1024 * 1024);
        decoder
            .read_to_string(&mut xml)
            .context("Failed to decompress gzipped JMDict xml file")?;
        std::mem::drop(decoder);
        std::mem::drop(gzipped);
        debug!("unzipped jmdict file");

        let entries = parse_jmdict_xml(&xml).context("Failed to parse JMDict xml file")?;
        std::mem::drop(xml);
        debug!("parsed jmdict file");

        let mut dict_bytes: Vec<u8> = Vec::with_capacity(30 * 1024 * 1024);
        // TODO: Update JMnedict as well
        DictionaryView::build_and_encode_to(&[], &entries, &mut dict_bytes)
            .context("Failed to write dictionary file")?;
        let dict_array = Uint8Array::from(&dict_bytes[..]);
        let result = DictUpdateResult {
            dict_bytes: dict_array,
        };

        let dict = Dictionary::try_new(dict_bytes)?;
        self.inner.dictionary = dict;
        serialize_result(&result)
    }

    pub fn creation_date(&self) -> WasmResult<String> {
        let creation_date = self.inner.dictionary.creation_date()?;
        Ok(creation_date)
    }
}

#[wasm_bindgen]
pub fn dict_schema_ver() -> u16 {
    SCHEMA_VER
}

fn serialize_result<T: Serialize>(value: &T) -> WasmResult<JsValue> {
    let result = serde_wasm_bindgen::to_value(value);
    match result {
        Ok(inner) => Ok(inner),
        Err(_) => Err(anyhow!("Failed to serialize result to JSON").into()),
    }
}
