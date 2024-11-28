use anyhow::{Context, Result};
use yomikiri_dictionary::dictionary::{Dictionary as InnerDictionary, DictionaryMetadata};
use yomikiri_dictionary::entry::{Entry, NameEntry, Rarity, WordEntry};
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

    pub fn search(&self, term: &str) -> Result<Vec<Entry>> {
        let view = self.inner.borrow_view();
        let terms = &view.term_index;
        let idxs = terms.get(term)?;
        let entries = view.get_entries(&idxs)?;
        Ok(entries)
    }

    pub fn search_meaning(&self, query: &str) -> Result<Vec<Entry>> {
        let view = self.inner.borrow_view();
        let entries = view.search_meaning(query)?;
        Ok(entries)
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
        terms.has_starts_with_excluding(prefix)
    }

    pub fn contains(&self, term: &str) -> bool {
        self.inner.borrow_view().term_index.contains_key(term)
    }

    /// Returns json text of entries
    pub fn search_json(&self, term: &str) -> Result<Vec<String>> {
        let view = &self.inner.borrow_view();
        let terms = &self.inner.borrow_view().term_index;
        let idxs = terms.get(term)?;
        let entries = view.get_entries(&idxs)?;
        let jsons = entries
            .iter()
            .map(serde_json::to_string)
            .collect::<serde_json::Result<Vec<String>>>()
            .context("Failed to serialize dictionary entry into JSON")?;
        Ok(jsons)
    }

    pub fn metadata(&self) -> &DictionaryMetadata {
        &self.inner.borrow_view().metadata
    }

    /// Finds entries, ordered by what best matches token
    ///
    /// 0. Name entry -> Word entry
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

        let mut name_entries: Vec<NameEntry> = vec![];
        // word entry metas
        let mut entry_metas: Vec<EntryMeta> = vec![];

        let entries = self.search(&token.base)?;
        for entry in entries {
            match entry {
                Entry::Word(entry) => {
                    let rarity = entry.term_rarity(&token.base)?;
                    let entry_meta = EntryMeta {
                        entry,
                        rarity,
                        from_base: true,
                    };
                    entry_metas.push(entry_meta);
                }
                Entry::Name(entry) => {
                    name_entries.push(entry);
                }
            }
        }

        let entries = self.search(&token.text)?;
        for entry in entries {
            match entry {
                Entry::Word(entry) => {
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
                Entry::Name(entry) => {
                    if name_entries.contains(&entry) {
                        continue;
                    }
                    name_entries.push(entry);
                }
            }
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

        let mut entries: Vec<Entry> = name_entries.into_iter().map(Entry::Name).collect();
        for meta in entry_metas {
            entries.push(Entry::Word(meta.entry));
        }
        Ok(entries)
    }
}
