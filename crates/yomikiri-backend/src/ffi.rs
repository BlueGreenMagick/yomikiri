use crate::dictionary::Dictionary;
use crate::error::{FFIResult, ToUniFFIResult};
use crate::tokenize::create_tokenizer;
use crate::{utils, SharedBackend};

use anyhow::{Context, Result};
use flate2::read::GzDecoder;
use yomikiri_dictionary::dictionary::DictionaryView;
use yomikiri_dictionary::jmdict::parse_jmdict_xml;
use yomikiri_dictionary::jmnedict::parse_jmnedict_xml;
use yomikiri_dictionary::{DICT_FILENAME, SCHEMA_VER};

use fs_err::{self as fs, File};
use std::io::{BufReader, Read};
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

    pub fn tokenize(&self, sentence: String, char_at: u32) -> FFIResult<String> {
        self._tokenize(sentence, char_at).uniffi()
    }

    pub fn search(&self, term: String, char_at: u32) -> FFIResult<String> {
        self._search(term, char_at).uniffi()
    }

    pub fn creation_date(&self) -> FFIResult<String> {
        let backend = self.inner.lock().unwrap();
        backend.dictionary.creation_date().uniffi()
    }
}

impl RustBackend {
    fn _new(dict_path: String) -> Result<Arc<RustBackend>> {
        Self::try_from_paths(&dict_path)
    }

    fn _tokenize(&self, sentence: String, char_at: u32) -> Result<String> {
        let mut backend = self.inner.lock().unwrap();
        let char_at = usize::try_from(char_at)
            .with_context(|| format!("Failed to convert char_at '{}' to usize", char_at))?;
        let result = backend.tokenize(&sentence, char_at)?;
        let json = serde_json::to_string(&result)?;
        Ok(json)
    }

    fn _search(&self, term: String, char_at: u32) -> Result<String> {
        let mut backend = self.inner.lock().unwrap();
        let char_at = usize::try_from(char_at)
            .with_context(|| format!("Failed to convert char_at '{}' to usize", char_at))?;
        let result = backend.search(&term, char_at)?;
        let json = serde_json::to_string(&result)?;
        Ok(json)
    }
}

#[derive(uniffi::Object)]
pub struct DictFilesReplaceJob {
    temp_dir: PathBuf,
}

#[uniffi::export]
impl DictFilesReplaceJob {
    pub fn replace(&self, dict_path: String) -> FFIResult<Arc<RustBackend>> {
        self._replace(Path::new(&dict_path)).uniffi()
    }
}

impl DictFilesReplaceJob {
    /// Replace user dictionary files.
    ///
    /// Returns a new `RustBackend` with replaced files.
    /// If an error occurs with new files when initializing `RustBackend`,
    /// it tries to restore the previous user dictionary, then an error is thrown.
    fn _replace(&self, dict_path: &Path) -> Result<Arc<RustBackend>> {
        let backup_dir = self.temp_dir.join("prev");
        if backup_dir.exists() {
            fs::remove_dir_all(&backup_dir)?;
        }
        fs::create_dir(&backup_dir)?;

        let backup_dict_path = backup_dir.join(DICT_FILENAME);
        let temp_dict_path = self.temp_dir.join(DICT_FILENAME);

        if dict_path.exists() {
            fs::rename(dict_path, &backup_dict_path)?;
        }

        fs::rename(&temp_dict_path, &dict_path)?;

        let backend_result = RustBackend::try_from_paths(&dict_path);
        match backend_result {
            Ok(backend) => {
                _ = fs::remove_dir_all(&self.temp_dir);
                Ok(backend)
            }
            Err(e) => {
                fs::remove_file(&dict_path)?;
                if backup_dict_path.exists() {
                    fs::rename(&backup_dict_path, &dict_path)?;
                }
                _ = fs::remove_dir_all(&self.temp_dir);
                Err(e)
            }
        }
    }
}

#[derive(uniffi::Enum)]
pub enum UpdateDictionaryResult {
    UpToDate,
    Replace {
        job: Arc<DictFilesReplaceJob>,
        etag: Option<String>,
    },
}

#[derive(uniffi::Enum)]
pub enum DownloadDictionaryResult {
    UpToDate,
    Replace { etag: Option<String> },
}

#[uniffi::export]
pub fn download_jmdict(dir: String, etag: Option<String>) -> FFIResult<DownloadDictionaryResult> {
    let dir = PathBuf::from(dir);
    download_dictionary_xml(
        &dir,
        "JMdict_e.gz",
        "http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz",
        etag.as_deref(),
    )
    .uniffi()
}

#[uniffi::export]
pub fn download_jmnedict(dir: String, etag: Option<String>) -> FFIResult<DownloadDictionaryResult> {
    let dir = PathBuf::from(dir);
    download_dictionary_xml(
        &dir,
        "JMnedict.xml.gz",
        "http://ftp.edrdg.org/pub/Nihongo/JMnedict.xml.gz",
        etag.as_deref(),
    )
    .uniffi()
}

/// `dir` must exist
pub fn download_dictionary_xml(
    dir: &Path,
    filename: &str,
    url: &str,
    etag: Option<&str>,
) -> Result<DownloadDictionaryResult> {
    let target_path = dir.join(filename);

    let mut req = ureq::get(url);
    if let Some(etag) = etag {
        if target_path.try_exists()? {
            req = req.set("If-None-Match", etag);
        }
    }
    let resp = req.call()?;

    if resp.status() == 304 {
        return Ok(DownloadDictionaryResult::UpToDate);
    }

    let temp_path = dir.join(format!("{}.temp", filename));

    let etag = resp.header("ETag").map(|s| s.to_owned());
    let mut reader = resp.into_reader();
    let mut file = File::create(&temp_path)?;
    std::io::copy(&mut reader, &mut file)?;

    fs::rename(&temp_path, &target_path)?;

    Ok(DownloadDictionaryResult::Replace { etag })
}

/// Creates `english.yomikiridict` at directory
#[uniffi::export]
pub fn create_dictionary(dir: String) -> FFIResult<()> {
    _create_dictionary(dir).uniffi()
}

fn _create_dictionary(dir: String) -> Result<()> {
    let dir = PathBuf::from(dir);
    let jmdict_path = dir.join("JMdict_e.gz");
    let jmnedict_path = dir.join("JMnedict.xml.gz");
    let temp_dict_path = dir.join(format!("{}.temp", DICT_FILENAME));
    let dict_path = dir.join(DICT_FILENAME);

    let jmnedict_file = File::open(&jmnedict_path)?;
    let jmnedict_reader = BufReader::new(jmnedict_file);
    let jmnedict_xml = decode_gzip_xml(jmnedict_reader, 160 * 1024 * 1024)?;

    let (name_entries, mut word_entries) =
        parse_jmnedict_xml(&jmnedict_xml).context("Failed to parse JMneDict xml file")?;
    std::mem::drop(jmnedict_xml);

    let jmdict_file = File::open(&jmdict_path)?;
    let jmdict_reader = BufReader::new(jmdict_file);
    let jmdict_xml = decode_gzip_xml(jmdict_reader, 64 * 1024 * 1024)?;

    let entries = parse_jmdict_xml(&jmdict_xml).context("Failed to parse JMDict xml file")?;
    std::mem::drop(jmdict_xml);
    word_entries.extend(entries);

    let mut temp_dict_file = File::create(&temp_dict_path)?;
    // TODO: update JMnedict as well
    DictionaryView::build_and_encode_to(&name_entries, &word_entries, &mut temp_dict_file)?;
    std::mem::drop(temp_dict_file);
    fs::rename(&temp_dict_path, &dict_path)?;

    Ok(())
}

fn decode_gzip_xml<R: Read>(gzipped: R, capacity: usize) -> Result<String> {
    let mut decoder = GzDecoder::new(gzipped);
    let mut xml = String::with_capacity(capacity);
    decoder.read_to_string(&mut xml)?;
    return Ok(xml);
}

/// Downloads and writes new dictionary files into specif
#[uniffi::export]
pub fn dict_schema_ver() -> u16 {
    SCHEMA_VER
}

// TODO: switch to Memmap
impl Dictionary<Vec<u8>> {
    pub fn from_paths<P: AsRef<Path>>(dict_path: P) -> Result<Dictionary<Vec<u8>>> {
        let bytes = fs::read(dict_path.as_ref())?;
        Dictionary::try_new(bytes)
    }
}
