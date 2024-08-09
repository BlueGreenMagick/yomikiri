use super::error::FFIResult;

use crate::dictionary::Dictionary;
use crate::error::{YResult, YomikiriError};
use crate::tokenize::{create_tokenizer, RawTokenizeResult};
use crate::{utils, SharedBackend};

use std::fs::File;
use std::path::Path;
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
    pub fn new(index_path: String, entries_path: String) -> FFIResult<Arc<RustBackend>> {
        Self::try_from_paths(&index_path, &entries_path)
    }

    pub fn tokenize(&self, sentence: String, char_at: u32) -> FFIResult<RawTokenizeResult> {
        let mut backend = self.inner.lock().unwrap();
        let char_at = usize::try_from(char_at).map_err(|_| {
            YomikiriError::ConversionError("Failed to convert char_at to usize".into())
        })?;
        let result = backend.tokenize(&sentence, char_at)?;
        Ok(result)
    }

    pub fn search(&self, term: String, char_at: u32) -> FFIResult<RawTokenizeResult> {
        let mut backend = self.inner.lock().unwrap();
        let char_at = usize::try_from(char_at).map_err(|_| {
            YomikiriError::ConversionError("Failed to convert char_at to usize".into())
        })?;
        let result = backend.search(&term, char_at)?;
        Ok(result)
    }
}
