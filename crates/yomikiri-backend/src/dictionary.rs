use anyhow::{anyhow, Context, Result};
use fst::{IntoStreamer, Streamer};
use regex::Regex;
use yomikiri_dictionary::dictionary::Dictionary as InnerDictionary;
use yomikiri_dictionary::entry::{Entry, Rarity, WordEntry};
use yomikiri_dictionary::PartOfSpeech;

use crate::tokenize::InnerToken;

pub struct Dictionary<D: AsRef<[u8]> + 'static> {
    inner: InnerDictionary<D>,
}

impl<D: AsRef<[u8]> + 'static> Dictionary<D> {
    pub fn try_new(source: D) -> Result<Dictionary<D>> {
        let inner =
            InnerDictionary::try_decode(source).context("Could not read dictionary file.")?;
        Ok(Self { inner })
    }

    pub fn search(&self, term: &str) -> Result<Vec<WordEntry>> {
        let view = self.inner.borrow_view();
        let terms = &view.term_index;
        if let Some(value) = terms.map.get(term) {
            let entry_indexes = terms.parse_value(value)?;
            let entries: Vec<WordEntry> = entry_indexes
                .iter()
                .map(|idx| view.entries.get(*idx))
                .collect::<yomikiri_dictionary::error::Result<Vec<WordEntry>>>(
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
            let entries: Vec<WordEntry> = entry_indexes
                .iter()
                .map(|idx| view.entries.get(*idx))
                .collect::<yomikiri_dictionary::error::Result<Vec<WordEntry>>>(
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
            if let Some(grouped_sense) = entry.grouped_senses.first() {
                if let Some(sense) = grouped_sense.senses.first() {
                    if let Some(meaning) = sense.meanings.first() {
                        if let Some(mat) = date_reg.find(meaning) {
                            return Ok(mat.as_str().to_owned());
                        }
                    }
                }
            }
        }

        Err(anyhow!("Could not find creation date in dictionary"))
    }

    /// Finds entries, ordered by what best matches token
    ///
    /// 1. Non-search -> search-only
    /// 2. token.base -> token.text
    /// 3. Entries whose POS matches token.pos
    /// 4. Rare -> Non rare
    /// 5. Entry with higher priority is shown first

    pub(crate) fn search_for_token(&self, token: &InnerToken) -> Result<Vec<Entry>> {
        struct EntryMeta {
            entry: WordEntry,
            rarity: Rarity,
            from_base: bool,
        }

        // Gather all entries
        let mut entry_metas: Vec<EntryMeta> = vec![];

        let entries = self.search(&token.base)?;
        for entry in entries {
            let rarity = entry.term_rarity(&token.base)?;
            let entry_meta = EntryMeta {
                entry,
                rarity,
                from_base: true,
            };
            entry_metas.push(entry_meta);
        }

        let entries = self.search(&token.text)?;
        for entry in entries {
            if entry_metas.iter().any(|e| e.entry == entry) {
                continue;
            }
            let rarity = entry.term_rarity(&token.text)?;
            let entry_meta = EntryMeta {
                entry,
                rarity,
                from_base: false,
            };
            entry_metas.push(entry_meta);
        }

        // Sort entries. Less means 'a' comes before 'b'
        entry_metas.sort_by(|a, b| {
            let a_is_search = a.rarity == Rarity::Search;
            let b_is_search = b.rarity == Rarity::Search;
            a_is_search
                .cmp(&b_is_search)
                .then(a.from_base.cmp(&b.from_base).reverse())
                .then_with(|| {
                    let pos = PartOfSpeech::from(&token.pos);
                    a.entry.has_pos(pos).cmp(&b.entry.has_pos(pos)).reverse()
                })
                .then_with(|| {
                    let a_is_normal = a.rarity == Rarity::Normal;
                    let b_is_normal = a.rarity == Rarity::Normal;
                    a_is_normal.cmp(&b_is_normal).reverse()
                })
                .then(a.entry.priority.cmp(&b.entry.priority).reverse())
        });

        let entries = entry_metas
            .into_iter()
            .map(|meta| Entry::Word(meta.entry))
            .collect();
        Ok(entries)
    }
}
