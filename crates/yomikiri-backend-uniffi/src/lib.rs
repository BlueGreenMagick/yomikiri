use yomikiri_rs::dictionary::Dictionary;
use yomikiri_rs::error::{FFIResult, ToUniFFIResult};
use yomikiri_rs::tokenize::create_tokenizer;
use yomikiri_rs::SharedBackend;

use anyhow::{Context, Result};
use flate2::bufread::GzDecoder;
use memmap2::{Mmap, MmapOptions};
use serde_json;
use uniffi;
use ureq;
use yomikiri_dictionary::dictionary::DictionaryWriter;
use yomikiri_dictionary::{DICT_FILENAME, SCHEMA_VER};

use fs_err::{self as fs, File};
use std::io::BufReader;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

/// `cfg_apple! { ... }` to compile only for apple platforms
///
/// `cfg_apple! { else ... }` to compile only for non-apple platforms
macro_rules! cfg_apple {
  (else $($item:item)*) => {
    $(
      #[cfg(not(any(target_os = "macos", target_os = "ios")))]
      $item
    )*
  };

  ($($item:item)*) => {
    $(
      #[cfg(any(target_os = "macos", target_os = "ios"))]
      $item
    )*
  };
}

#[derive(uniffi::Object)]
pub struct RustBackend {
    inner: Mutex<SharedBackend<Mmap>>,
}

impl RustBackend {
    pub(crate) fn try_from_paths<P: AsRef<Path>>(dict_path: P) -> Result<Arc<RustBackend>> {
        setup_logger();
        let tokenizer = create_tokenizer();
        let dictionary = create_dictionary_from_path(dict_path)?;
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

    /// Returns JSON string if DictionaryMetadata
    pub fn metadata(&self) -> FFIResult<String> {
        self._metadata().uniffi()
    }
}

impl RustBackend {
    fn _new(dict_path: String) -> Result<Arc<RustBackend>> {
        Self::try_from_paths(&dict_path)
    }

    fn _tokenize(&self, sentence: String, char_at: u32) -> Result<String> {
        let backend = self.inner.lock().unwrap();
        let char_at = usize::try_from(char_at)
            .with_context(|| format!("Failed to convert char_at '{}' to usize", char_at))?;
        let result = backend.tokenize(&sentence, char_at)?;
        let json = serde_json::to_string(&result)?;
        Ok(json)
    }

    fn _search(&self, term: String, char_at: u32) -> Result<String> {
        let backend = self.inner.lock().unwrap();
        let char_at = usize::try_from(char_at)
            .with_context(|| format!("Failed to convert char_at '{}' to usize", char_at))?;
        let result = backend.search(&term, char_at)?;
        let json = serde_json::to_string(&result)?;
        Ok(json)
    }

    fn _metadata(&self) -> Result<String> {
        let backend = self.inner.lock().unwrap();
        let metadata = backend.dictionary.metadata();
        let json = serde_json::to_string(metadata)?;
        Ok(json)
    }
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

    let writer = DictionaryWriter::new();

    let jmdict_reader = decode_gzip_xml(&jmdict_path)?;
    let writer = writer
        .read_jmdict(jmdict_reader)
        .context("Failed to parse JMDict xml file")?;

    let jmnedict_reader = decode_gzip_xml(&jmnedict_path)?;
    let writer = writer
        .read_jmnedict(jmnedict_reader)
        .context("Failed to parse JMneDict xml file")?;

    let mut temp_dict_file = File::create(&temp_dict_path)?;
    writer
        .write(&mut temp_dict_file)
        .context("Failed to write dictionary file")?;
    std::mem::drop(temp_dict_file);
    fs::rename(&temp_dict_path, &dict_path)?;

    Ok(())
}

fn decode_gzip_xml(path: &Path) -> Result<BufReader<GzDecoder<BufReader<File>>>> {
    let file = File::open(path)?;
    let gzip_reader = BufReader::new(file);
    let decoder = GzDecoder::new(gzip_reader);
    let reader = BufReader::new(decoder);
    Ok(reader)
}

/// Downloads and writes new dictionary files into specif
#[uniffi::export]
pub fn dict_schema_ver() -> u16 {
    SCHEMA_VER
}

fn create_dictionary_from_path<P: AsRef<Path>>(dict_path: P) -> Result<Dictionary<Mmap>> {
    let file = File::open(dict_path.as_ref())?;
    let mmap = unsafe { MmapOptions::new().map(&file)? };
    Dictionary::try_new(mmap)
}

cfg_apple! {
  pub fn setup_logger() {
    let logger = oslog::OsLogger::new("com.yoonchae.Yomikiri.Extension")
        .level_filter(log::LevelFilter::Debug);
    if logger.init().is_err() {
        log::warn!("os_log was already initialized");
    }
  }
}

cfg_apple! { else
  pub fn setup_logger() {
    eprintln!("No logger configurable for targets not wasm nor apple")
  }
}

uniffi::setup_scaffolding!();
