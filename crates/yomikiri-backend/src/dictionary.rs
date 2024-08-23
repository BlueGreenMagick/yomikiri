use anyhow::{anyhow, Context, Result};
use fst::{IntoStreamer, Streamer};
use regex::Regex;
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

    pub fn search(&self, term: &str) -> Result<Vec<Entry>> {
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
    pub fn has_starts_with_excluding(&self, prefix: &str) -> bool {
        // assumes there is at least 1 entry.
        // needed in order to create a bytestring that is 1 greater than prefix below
        if prefix.is_empty() {
            return true;
        }

        let mut next_prefix_bytes = prefix.as_bytes().to_vec();
        let len = next_prefix_bytes.len();
        next_prefix_bytes[len - 1] += 1;

        let terms = &self.inner.borrow_view().term_index;
        terms
            .map
            .range()
            .gt(prefix)
            .lt(&next_prefix_bytes)
            .into_stream()
            .next()
            .is_some()
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

    pub fn creation_date(&self) -> Result<String> {
        let entries = self.search("ＪＭｄｉｃｔ")?;
        let date_reg =
            Regex::new(r#"\d\d\d\d-\d\d-\d\d"#).context("Could not create regexp object")?;
        for entry in entries {
            if let Some(sense) = entry.senses.first() {
                if let Some(meaning) = sense.meaning.first() {
                    if let Some(mat) = date_reg.find(meaning) {
                        return Ok(mat.as_str().to_owned());
                    }
                }
            }
        }

        Err(anyhow!("Could not find creation date in dictionary"))
    }
}
