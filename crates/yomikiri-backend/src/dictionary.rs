use std::cmp::Ordering;

use anyhow::{Context, Result};
use yomikiri_dictionary::dictionary::{Dictionary as InnerDictionary, DictionaryMetadata};
use yomikiri_dictionary::entry::{Entry, Rarity};
use yomikiri_dictionary::PartOfSpeech;
use yomikiri_unidic_types::UnidicPos;

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

    pub fn search_term(&self, term: &str) -> Result<Vec<Entry>> {
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

    pub fn metadata(&self) -> &DictionaryMetadata {
        &self.inner.borrow_view().metadata
    }

    /// Finds entries, ordered by what best matches token
    ///
    /// 1. Non-search -> search-only
    /// 2. token.base -> token.text
    /// 3. If POS is proper noun, prioritize proper noun
    /// 4. Entries whose POS matches token.pos
    /// 5. Rare -> Non rare
    /// 6. Entry with higher priority is shown first
    pub(crate) fn search_for_token(&self, token: &InnerToken) -> Result<Vec<Entry>> {
        struct EntryMeta {
            entry: Entry,
            rarity: Rarity,
            from_base: bool,
        }

        // word entry metas
        let mut entry_metas: Vec<EntryMeta> = vec![];

        let entries = self.search_term(&token.base)?;
        for entry in entries {
            match entry {
                Entry::Word(inner) => {
                    let rarity = inner.term_rarity(&token.base)?;
                    let entry_meta = EntryMeta {
                        entry: inner.into(),
                        rarity,
                        from_base: true,
                    };
                    entry_metas.push(entry_meta);
                }
                Entry::Name(inner) => {
                    let rarity = Rarity::Normal;
                    let entry_meta = EntryMeta {
                        entry: inner.into(),
                        rarity,
                        from_base: true,
                    };
                    entry_metas.push(entry_meta);
                }
            }
        }

        let entries = self.search_term(&token.text)?;
        for entry in entries {
            match entry {
                Entry::Word(inner) => {
                    if entry_metas.iter().any(|e| match &e.entry {
                        Entry::Word(i) => i.id == inner.id,
                        _ => false,
                    }) {
                        continue;
                    }
                    let rarity = inner.term_rarity(&token.text)?;
                    let entry_meta = EntryMeta {
                        entry: inner.into(),
                        rarity,
                        from_base: false,
                    };
                    entry_metas.push(entry_meta);
                }
                Entry::Name(inner) => {
                    if entry_metas.iter().any(|e| match &e.entry {
                        Entry::Name(i) => i.kanji == inner.kanji,
                        _ => false,
                    }) {
                        continue;
                    }
                    let rarity = Rarity::Normal;
                    let entry_meta = EntryMeta {
                        entry: inner.into(),
                        rarity,
                        from_base: false,
                    };
                    entry_metas.push(entry_meta);
                }
            }
        }

        let pos = PartOfSpeech::from(&token.pos);

        // Sort entries. Less means 'a' comes before 'b'
        entry_metas.sort_by(|a, b| {
            let a_is_search = a.rarity == Rarity::Search;
            let b_is_search = b.rarity == Rarity::Search;
            a_is_search
                .cmp(&b_is_search)
                .then(a.from_base.cmp(&b.from_base).reverse())
                .then_with(|| {
                    if token.pos == UnidicPos::Noun(yomikiri_unidic_types::UnidicNounPos2::固有名詞)
                    {
                        matches!(a.entry, Entry::Name(_))
                            .cmp(&matches!(b.entry, Entry::Name(_)))
                            .reverse()
                    } else {
                        Ordering::Equal
                    }
                })
                .then_with(|| a.entry.has_pos(pos).cmp(&b.entry.has_pos(pos)).reverse())
                .then_with(|| {
                    let a_is_normal = a.rarity == Rarity::Normal;
                    let b_is_normal = a.rarity == Rarity::Normal;
                    a_is_normal.cmp(&b_is_normal).reverse()
                })
                .then(a.entry.priority().cmp(&b.entry.priority()).reverse())
        });

        let entries: Vec<Entry> = entry_metas.into_iter().map(|m| m.entry).collect();
        Ok(entries)
    }
}
