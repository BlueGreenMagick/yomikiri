use anyhow::{Context, Result};
use fs_err as fs;
use fst::{IntoStreamer, Streamer};
use std::path::Path;
use yomikiri_dictionary::dictionary::Dictionary as InnerDictionary;
use yomikiri_dictionary::entry::Entry;

pub struct Dictionary<D: AsRef<[u8]> + 'static> {
    inner: InnerDictionary<D>,
}

impl<D: AsRef<[u8]> + 'static> Dictionary<D> {
    pub fn try_new(source: D) -> Result<Dictionary<D>> {
        let inner =
            InnerDictionary::try_decode(source).context("Could not read dictionary file.")?;
        Ok(Self { inner })
    }

    pub fn search(&mut self, term: &str) -> Result<Vec<Entry>> {
        let view = self.inner.borrow_view();
        let terms = &view.term_index;
        if let Some(value) = terms.map.get(term) {
            let entry_indexes = terms.parse_value(value)?;
            let entries: Vec<Entry> = entry_indexes
                .iter()
                .map(|idx| view.entries.get(*idx))
                .collect::<yomikiri_dictionary::error::Result<Vec<Entry>>>(
            )?;
            Ok(entries)
        } else {
            Ok(Vec::new())
        }
    }

    /// Returns true only if there is a dictionary term
    /// that starts with `prefix` and is not `prefix`
    pub fn has_starts_with_excluding(&mut self, prefix: &str) -> bool {
        // assumes there is at least 1 entry.
        // needed in order to create a bytestring that is 1 greater than prefix below
        if prefix.len() == 0 {
            return true;
        }

        let mut next_prefix_bytes = prefix.as_bytes().to_vec();
        let len = next_prefix_bytes.len();
        next_prefix_bytes[len - 1] += 1;

        let terms = &self.inner.borrow_view().term_index;
        if let Some(_) = terms
            .map
            .range()
            .gt(prefix)
            .lt(&next_prefix_bytes)
            .into_stream()
            .next()
        {
            true
        } else {
            false
        }
    }

    pub fn contains(&self, term: &str) -> bool {
        self.inner.borrow_view().term_index.map.contains_key(term)
    }

    /// Returns json text of entries
    pub fn search_json(&self, term: &str) -> Result<Vec<String>> {
        let view = &self.inner.borrow_view();
        let terms = &self.inner.borrow_view().term_index;
        if let Some(value) = terms.map.get(term) {
            let entry_indexes = terms.parse_value(value)?;
            let entries: Vec<Entry> = entry_indexes
                .iter()
                .map(|idx| view.entries.get(*idx))
                .collect::<yomikiri_dictionary::error::Result<Vec<Entry>>>(
            )?;
            let jsons = entries
                .iter()
                .map(serde_json::to_string)
                .collect::<serde_json::Result<Vec<String>>>()
                .context("Failed to serialize dictionary entry into JSON")?;
            Ok(jsons)
        } else {
            Ok(Vec::new())
        }
    }
}

// TODO: switch to Memmap
impl Dictionary<Vec<u8>> {
    pub fn from_paths<P: AsRef<Path>>(dict_path: P) -> Result<Dictionary<Vec<u8>>> {
        let bytes = fs::read(dict_path.as_ref())?;
        Ok(Dictionary::try_new(bytes)?)
    }
}
