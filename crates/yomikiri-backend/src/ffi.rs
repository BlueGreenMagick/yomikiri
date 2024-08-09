use flate2::read::GzDecoder;
use tempfile::NamedTempFile;
use yomikiri_dictionary::file::{
    parse_jmdict_xml, write_entries, write_indexes, DICT_ENTRIES_FILENAME, DICT_INDEX_FILENAME,
    DICT_METADATA_FILENAME,
};
use yomikiri_dictionary::metadata::DictMetadata;

use crate::dictionary::Dictionary;
use crate::error::{YResult, YomikiriError};
use crate::tokenize::{create_tokenizer, RawTokenizeResult};
use crate::{utils, SharedBackend};
use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

#[derive(uniffi::Object)]
pub struct RustBackend {
    inner: Mutex<SharedBackend<Vec<u8>, File>>,
}

impl RustBackend {
    fn try_from_paths<P1: AsRef<Path>, P2: AsRef<Path>>(
        index_path: P1,
        entries_path: P2,
    ) -> YResult<Arc<RustBackend>> {
        utils::setup_logger();
        let tokenizer = create_tokenizer();
        let dictionary = Dictionary::from_paths(index_path, entries_path)?;
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
    pub fn new(index_path: String, entries_path: String) -> YResult<Arc<RustBackend>> {
        Self::try_from_paths(&index_path, &entries_path)
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

#[derive(uniffi::Object)]
pub struct DictFilesReplaceJob {
    temp_dir: PathBuf,
}

#[uniffi::export]
impl DictFilesReplaceJob {
    /// Replace user dictionary files.
    ///
    /// Returns a new `RustBackend` with replaced files.
    /// If an error occurs with new files when initializing `RustBackend`,
    /// it tries to restore the previous user dictionary, then an error is thrown.
    pub fn replace(
        &self,
        index_path: String,
        entries_path: String,
        metadata_path: String,
    ) -> YResult<Arc<RustBackend>> {
        let backup_dir = self.temp_dir.join("prev");
        fs::create_dir(&backup_dir)?;
        let backup_index_path = backup_dir.join(DICT_INDEX_FILENAME);
        let backup_entries_path = backup_dir.join(DICT_ENTRIES_FILENAME);
        let backup_metadata_path = backup_dir.join(DICT_METADATA_FILENAME);

        let temp_index_path = self.temp_dir.join(DICT_INDEX_FILENAME);
        let temp_entries_path = self.temp_dir.join(DICT_ENTRIES_FILENAME);
        let temp_metadata_path = self.temp_dir.join(DICT_METADATA_FILENAME);

        fs::rename(&index_path, &backup_index_path)?;
        fs::rename(&entries_path, &backup_entries_path)?;
        fs::rename(&metadata_path, &backup_metadata_path)?;

        fs::rename(&temp_index_path, &index_path)?;
        fs::rename(&temp_entries_path, &entries_path)?;
        fs::rename(&temp_metadata_path, &metadata_path)?;

        let backend_result = RustBackend::try_from_paths(&index_path, &entries_path);
        match backend_result {
            Ok(backend) => Ok(backend),
            Err(e) => {
                fs::rename(&backup_index_path, &index_path)?;
                fs::rename(&backup_entries_path, &entries_path)?;
                fs::rename(&backup_metadata_path, &metadata_path)?;
                Err(e)
            }
        }
    }
}

/// Downloads and writes new dictionary files into specified path.
#[uniffi::export]
pub fn update_dictionary_file(temp_dir: String) -> YResult<DictFilesReplaceJob> {
    let entries = {
        // JMDict is currently 58MB.
        let mut bytes: Vec<u8> = Vec::with_capacity(72 * 1024 * 1024);
        download_dictionary(&mut bytes)?;
        let xml = String::from_utf8(bytes)?;
        parse_jmdict_xml(&xml)
    }?;
    let temp_dir = Path::new(&temp_dir);
    let mut temp_entries_file = NamedTempFile::new_in(&temp_dir)?;
    let mut temp_index_file = NamedTempFile::new_in(&temp_dir)?;
    let term_indexes = write_entries(&mut temp_entries_file, &entries)?;
    write_indexes(&mut temp_index_file, &term_indexes)?;

    let index_file_size = fs::metadata(temp_entries_file.path())?.len();
    let entries_file_size = fs::metadata(temp_index_file.path())?.len();
    let files_size = index_file_size + entries_file_size;
    let metadata = DictMetadata::new(files_size, true);
    let metadata_json = metadata.to_json()?;
    let mut temp_metadata_file = NamedTempFile::new_in(&temp_dir)?;
    temp_metadata_file.write_all(&metadata_json.as_bytes())?;

    let replace_job = DictFilesReplaceJob {
        temp_dir: temp_dir.to_path_buf(),
    };

    Ok(replace_job)
}

fn download_dictionary<W: Write>(writer: &mut W) -> YResult<()> {
    let download_url = "http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz";
    let resp = ureq::get(download_url).call()?;
    let mut decoder = GzDecoder::new(resp.into_reader());
    std::io::copy(&mut decoder, writer)?;
    Ok(())
}
