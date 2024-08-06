use flate2::read::GzDecoder;
use yomikiri_dictionary::file::{parse_jmdict_xml, write_entries, write_indexes};
use yomikiri_dictionary::metadata::DictMetadata;

use crate::dictionary::Dictionary;
use crate::error::{YResult, YomikiriError};
use crate::tokenize::{create_tokenizer, RawTokenizeResult};
use crate::{utils, SharedBackend};
use std::fs::{self, File};
use std::io::Write;
use std::sync::{Arc, Mutex};

#[derive(uniffi::Object)]
pub struct Backend {
    inner: Mutex<SharedBackend<Vec<u8>, File>>,
}

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

    pub fn search(&self, term: String, char_at: u32) -> YResult<RawTokenizeResult> {
        let mut backend = self.inner.lock().unwrap();
        let char_at = usize::try_from(char_at).map_err(|_| {
            YomikiriError::ConversionError("Failed to convert char_at to usize".into())
        })?;
        backend.search(&term, char_at)
    }
}

/// Downloads and writes new dictionary files into specified path.
/// The files are written in-place.
#[uniffi::export]
pub fn update_dictionary_file(index_path: String, entries_path: String) -> YResult<DictMetadata> {
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

    let index_file_size = fs::metadata(&index_path)?.len();
    let entries_file_size = fs::metadata(&entries_path)?.len();
    let files_size = index_file_size + entries_file_size;
    let metadata = DictMetadata::new(files_size, true);

    Ok(metadata)
}

fn download_dictionary<W: Write>(writer: &mut W) -> YResult<()> {
    let download_url = "http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz";
    let resp = ureq::get(download_url).call()?;
    let mut decoder = GzDecoder::new(resp.into_reader());
    std::io::copy(&mut decoder, writer)?;
    Ok(())
}
