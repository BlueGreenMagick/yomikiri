use bincode::Options;
use flate2::read::GzDecoder;
use yomikiri_dictionary::file::{write_entries, write_indexes, DictTermIndex};
use yomikiri_jmdict::parse_jmdict_xml;

use crate::dictionary::Dictionary;
use crate::error::{YResult, YomikiriError};
use crate::tokenize::{create_tokenizer, RawTokenizeResult};
use crate::{utils, SharedBackend};
use std::fs::File;
use std::io::{BufReader, Write};
use std::sync::{Arc, Mutex};

#[derive(uniffi::Object)]
pub struct Backend {
    inner: Mutex<SharedBackend<File>>,
}

#[cfg(uniffi)]
#[uniffi::export]
impl Backend {
    #[uniffi::constructor]
    pub fn new(index_path: String, entries_path: String) -> YResult<Arc<Backend>> {
        utils::setup_logger();
        let tokenizer = create_tokenizer();
        let dictionary = Dictionary::from_paths(&index_path, &entries_path)?;
        let inner = SharedBackend {
            tokenizer,
            dictionary,
        };
        let inner = Mutex::new(inner);
        let backend = Backend { inner };
        Ok(Arc::new(backend))
    }

    pub fn tokenize(&self, sentence: String, char_at: u32) -> YResult<RawTokenizeResult> {
        let mut backend = self.inner.lock().unwrap();
        let char_at = usize::try_from(char_at).map_err(|_| {
            YomikiriError::ConversionError("Failed to convert char_at to usize".into())
        })?;
        backend.tokenize(&sentence, char_at)
    }

    pub fn search(&self, term: String) -> YResult<Vec<String>> {
        let mut backend = self.inner.lock().unwrap();
        backend.dictionary.search_json(&term)
    }

    pub fn update_dictionary_file(&self, index_path: String, entries_path: String) -> YResult<()> {
        let entries = {
            // JMDict is currently 58MB.
            let mut bytes: Vec<u8> = Vec::with_capacity(72 * 1024 * 1024);
            download_dictionary(&mut bytes)?;
            let xml = String::from_utf8(bytes)?;
            parse_jmdict_xml(&xml)
        }?;

        let mut entries_file = File::create(&entries_path)?;
        let term_indexes = write_entries(&mut entries_file, &entries)?;
        let mut index_file = File::create(&index_path)?;
        write_indexes(&mut index_file, &term_indexes)?;
        Ok(())
    }
}

impl Dictionary<File> {
    pub fn from_paths(index_path: &str, entries_path: &str) -> YResult<Dictionary<File>> {
        let index_file = File::open(index_path)?;
        let reader = BufReader::new(index_file);
        let options = bincode::DefaultOptions::new();
        let index: Vec<DictTermIndex> = options.deserialize_from(reader).map_err(|e| {
            YomikiriError::InvalidDictionaryFile(format!(
                "Failed to parse dictionary index file. {}",
                e
            ))
        })?;
        let entries_file = File::open(entries_path)?;
        Ok(Dictionary::new(index, entries_file))
    }
}

fn download_dictionary<W: Write>(writer: &mut W) -> YResult<()> {
    let download_url = "http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz";
    let resp = ureq::get(download_url).call()?;
    let mut decoder = GzDecoder::new(resp.into_reader());
    std::io::copy(&mut decoder, writer)?;
    Ok(())
}
