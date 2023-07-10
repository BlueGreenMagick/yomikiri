use crate::dictionary::Dictionary;
use crate::error::{YResult, YomikiriError};
use crate::tokenize::{create_tokenizer, RawTokenizeResult};
use crate::{utils, SharedBackend};
use std::fs::File;
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

    pub fn tokenize(&self, sentence: String, char_idx: u32) -> YResult<RawTokenizeResult> {
        let mut backend = self.inner.lock().unwrap();
        let char_idx = usize::try_from(char_idx).map_err(|_| {
            YomikiriError::OtherError("char_idx cannot be converted to usize".into())
        })?;
        backend.tokenize(&sentence, char_idx)
    }

    pub fn search(&self, term: String) -> YResult<Vec<String>> {
        let mut backend = self.inner.lock().unwrap();
        backend.dictionary.search_json(&term)
    }
}
