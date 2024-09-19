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
use std::io::BufReader;
use wasm_bindgen::prelude::*;
use yomikiri_dictionary::dictionary::DictionaryWriter;
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
    update_dictionary(jmdict: Uint8Array, jmnedict: Uint8Array): DictUpdateResult;
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
    pub fn update_dictionary(
        &mut self,
        gzip_jmdict: &Uint8Array,
        gzip_jmnedict: &Uint8Array,
    ) -> WasmResult<JsValue> {
        let writer = DictionaryWriter::new();
        let gzip_jmdict = gzip_jmdict.to_vec();
        let jmdict_decoder = GzDecoder::new(&gzip_jmdict[..]);
        let jmdict_reader = BufReader::new(jmdict_decoder);
        let writer = writer
            .read_jmdict(jmdict_reader)
            .context("Failed to parse JMDict xml file")?;
        debug!("parsed jmdict file");

        let gzip_jmnedict = gzip_jmnedict.to_vec();
        let jmnedict_decoder = GzDecoder::new(&gzip_jmnedict[..]);
        let jmnedict_reader = BufReader::new(jmnedict_decoder);
        let writer = writer
            .read_jmnedict(jmnedict_reader)
            .context("Failed to parse JMneDict xml file")?;

        let mut dict_bytes: Vec<u8> = Vec::with_capacity(84 * 1024 * 1024);
        writer
            .write(&mut dict_bytes)
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
