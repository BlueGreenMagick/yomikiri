use std::io::Read;
use std::sync::Once;

use crate::file::{parse_jmdict_xml, write_entries, write_indexes};
use crate::{Error, Result};

use flate2::bufread::GzDecoder;
use js_sys::{Array, Uint8Array};
use log::debug;
use wasm_bindgen::prelude::*;

#[cfg(wasm)]
impl Into<JsValue> for Error {
    fn into(self) -> JsValue {
        JsValue::from_str(&self.to_string())
    }
}

#[wasm_bindgen(typescript_custom_section)]
const TS_CUSTOM: &'static str = r#"
/** from jmdict gzipped xml, creates [index, entries] bytes */
export function create_dictionary(gzip: Uint8Array): [Uint8Array, Uint8Array];
"#;

/// from jmdict xml, creates [UInt8Array, UInt8Array] tuple
/// with .yomikiriindex and .yomikiridict bytes
#[wasm_bindgen(skip_typescript)]
pub fn create_dictionary(gzip_bytes: &Uint8Array) -> Result<JsValue> {
    set_panic_hook();
    setup_logger();

    let gzipped = gzip_bytes.to_vec();
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
    std::mem::drop(entries_bytes);

    let mut index_bytes: Vec<u8> = Vec::with_capacity(15 * 1024 * 1024);
    write_indexes(&mut index_bytes, &term_indexes)?;
    let index_array = Uint8Array::from(&index_bytes[..]);
    std::mem::drop(index_bytes);

    let tuple = Array::new_with_length(2);
    tuple.set(0, index_array.into());
    tuple.set(1, entries_array.into());
    Ok(tuple.into())
}

pub fn set_panic_hook() {
    console_error_panic_hook::set_once();
}

pub fn setup_logger() {
    static LOGGER_HOOK: Once = Once::new();
    LOGGER_HOOK.call_once(|| wasm_logger::init(wasm_logger::Config::default()))
}
