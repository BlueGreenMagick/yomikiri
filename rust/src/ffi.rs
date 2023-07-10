use yomikiri_dictionary_types::DictIndexItem;

use crate::dictionary::Dictionary;
use crate::error::{YResult, YomikiriError};
use crate::tokenizer::{createTokenizer, Token};
use crate::{utils, SharedBackend};
use std::fs::File;
use std::sync::Arc;

#[derive(uniffi::Object)]
pub struct Backend {
    inner: SharedBackend<File>,
}

#[cfg(uniffi)]
#[uniffi::export]
impl Backend {
    #[uniffi::constructor]
    fn new(index_path: String, entries_path: String) -> YResult<Arc<Backend>> {
        utils::setup_logger();
        let tokenizer = createTokenizer();
        let dictionary = Dictionary::try_new(&index_path, &entries_path)?;
        let inner = SharedBackend {
            tokenizer,
            dictionary,
        };
        let backend = Backend { inner };
        Ok(Arc::new(backend))
    }

    fn tokenize(&self, sentence: String) -> Vec<Token> {
        self.inner.tokenize_inner(&sentence).unwrap()
    }
}

impl Dictionary<File> {
    pub fn try_new(index_path: &str, entries_path: &str) -> YResult<Dictionary<File>> {
        let index_file = File::open(index_path)?;
        let index: Vec<DictIndexItem> = serde_json::from_reader(&index_file)
            .map_err(|_| YomikiriError::invalid_dictionary_file(index_path))?;
        let entries_file = File::open(entries_path)?;
        Ok(Dictionary::new(index, entries_file))
    }
}
