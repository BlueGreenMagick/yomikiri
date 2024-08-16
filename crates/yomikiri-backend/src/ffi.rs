use crate::dictionary::Dictionary;
use crate::error::{FFIResult, ToUniFFIResult};
use crate::tokenize::{create_tokenizer, RawTokenizeResult};
use crate::{utils, SharedBackend};

use anyhow::{Context, Result};
use flate2::read::GzDecoder;
use yomikiri_dictionary::dictionary::DictionaryView;
use yomikiri_dictionary::jmdict::parse_jmdict_xml;
use yomikiri_dictionary::metadata::DictMetadata;
use yomikiri_dictionary::{DICT_FILENAME, DICT_METADATA_FILENAME};

use fs_err::{self as fs, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

#[derive(uniffi::Object)]
pub struct RustBackend {
    inner: Mutex<SharedBackend<Vec<u8>>>,
}

impl RustBackend {
    pub(crate) fn try_from_paths<P: AsRef<Path>>(dict_path: P) -> Result<Arc<RustBackend>> {
        utils::setup_logger();
        let tokenizer = create_tokenizer();
        let dictionary = Dictionary::from_paths(dict_path)?;
        let inner = SharedBackend {
            tokenizer,
            dictionary,
        };
        let inner = Mutex::new(inner);
        let backend = RustBackend { inner };
        Ok(Arc::new(backend))
    }
}

#[uniffi::export]
impl RustBackend {
    #[uniffi::constructor]
    pub fn new(dict_path: String) -> FFIResult<Arc<RustBackend>> {
        Self::_new(dict_path).uniffi()
    }

    pub fn tokenize(&self, sentence: String, char_at: u32) -> FFIResult<RawTokenizeResult> {
        self._tokenize(sentence, char_at).uniffi()
    }

    pub fn search(&self, term: String, char_at: u32) -> FFIResult<RawTokenizeResult> {
        self._search(term, char_at).uniffi()
    }
}

impl RustBackend {
    fn _new(dict_path: String) -> Result<Arc<RustBackend>> {
        Self::try_from_paths(&dict_path)
    }

    fn _tokenize(&self, sentence: String, char_at: u32) -> Result<RawTokenizeResult> {
        let mut backend = self.inner.lock().unwrap();
        let char_at = usize::try_from(char_at)
            .with_context(|| format!("Failed to convert char_at '{}' to usize", char_at))?;
        let result = backend.tokenize(&sentence, char_at)?;
        Ok(result)
    }

    fn _search(&self, term: String, char_at: u32) -> Result<RawTokenizeResult> {
        let mut backend = self.inner.lock().unwrap();
        let char_at = usize::try_from(char_at)
            .with_context(|| format!("Failed to convert char_at '{}' to usize", char_at))?;
        let result = backend.search(&term, char_at)?;
        Ok(result)
    }
}

#[derive(uniffi::Object)]
pub struct DictFilesReplaceJob {
    temp_dir: PathBuf,
}

#[uniffi::export]
impl DictFilesReplaceJob {
    pub fn replace(&self, dict_path: String, metadata_path: String) -> FFIResult<Arc<RustBackend>> {
        self._replace(dict_path, metadata_path).uniffi()
    }
}

impl DictFilesReplaceJob {
    /// Replace user dictionary files.
    ///
    /// Returns a new `RustBackend` with replaced files.
    /// If an error occurs with new files when initializing `RustBackend`,
    /// it tries to restore the previous user dictionary, then an error is thrown.
    fn _replace(&self, dict_path: String, metadata_path: String) -> Result<Arc<RustBackend>> {
        let backup_dir = self.temp_dir.join("prev");
        if backup_dir.exists() {
            fs::remove_dir_all(&backup_dir)?;
        }
        fs::create_dir(&backup_dir)?;
        let backup_dict_path = backup_dir.join(DICT_FILENAME);
        let backup_metadata_path = backup_dir.join(DICT_METADATA_FILENAME);

        let temp_dict_path = self.temp_dir.join(DICT_FILENAME);
        let temp_metadata_path = self.temp_dir.join(DICT_METADATA_FILENAME);

        fs::rename(&dict_path, &backup_dict_path)?;
        fs::rename(&metadata_path, &backup_metadata_path)?;

        fs::rename(&temp_dict_path, &dict_path)?;
        fs::rename(&temp_metadata_path, &metadata_path)?;

        let backend_result = RustBackend::try_from_paths(&dict_path);
        match backend_result {
            Ok(backend) => {
                fs::remove_dir_all(&temp_dict_path)?;
                Ok(backend)
            }
            Err(e) => {
                fs::remove_file(&dict_path)?;
                fs::remove_file(&metadata_path)?;
                fs::rename(&backup_dict_path, &dict_path)?;
                fs::rename(&backup_metadata_path, &metadata_path)?;
                fs::remove_dir_all(&temp_dict_path)?;
                Err(e).into()
            }
        }
    }
}

/// Downloads and writes new dictionary files into specified path.
#[uniffi::export]
pub fn update_dictionary_file(temp_dir: String) -> FFIResult<DictFilesReplaceJob> {
    _update_dictionary_file(temp_dir).uniffi()
}

fn _update_dictionary_file(temp_dir: String) -> Result<DictFilesReplaceJob> {
    let entries = {
        // JMDict is currently 58MB.
        let mut bytes: Vec<u8> = Vec::with_capacity(72 * 1024 * 1024);
        download_dictionary(&mut bytes)?;
        let xml = String::from_utf8(bytes)?;
        parse_jmdict_xml(&xml)
    }?;
    let temp_dir = Path::new(&temp_dir);
    let temp_dict_path = temp_dir.join(DICT_FILENAME);
    let temp_metadata_path = temp_dir.join(DICT_METADATA_FILENAME);

    let mut temp_dict_file = File::create(&temp_dict_path)?;
    DictionaryView::build_and_encode_to(&entries, &mut temp_dict_file)?;
    std::mem::drop(temp_dict_file);

    let file_size = fs::metadata(&temp_dict_path)?.len();
    let metadata = DictMetadata::new(file_size, true);
    let metadata_json = metadata.to_json()?;
    let mut temp_metadata_file = File::create(&temp_metadata_path)?;
    temp_metadata_file.write_all(&metadata_json.as_bytes())?;

    let replace_job = DictFilesReplaceJob {
        temp_dir: temp_dir.to_path_buf(),
    };

    Ok(replace_job)
}

fn download_dictionary<W: Write>(writer: &mut W) -> Result<()> {
    let download_url = "http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz";
    let resp = ureq::get(download_url).call()?;
    let mut decoder = GzDecoder::new(resp.into_reader());
    std::io::copy(&mut decoder, writer)?;
    Ok(())
}
