use std::borrow::Cow;
use std::collections::{HashMap, HashSet};
use std::io::Write;

use itertools::Itertools;
use memchr::memchr2_iter;
use serde::{Deserialize, Serialize};
use unicode_normalization::{is_nfkd, UnicodeNormalization};

use crate::dictionary::DictionaryView;
use crate::entry::{Entry, NameEntry, WordEntry};
use crate::error::Result;
use crate::index::{
    DictIndexItem, DictIndexMap, EncodableIdx, EntryIdx, NameEntryIdx, WordEntryIdx,
};
use crate::utils::NFKCString;
use crate::Error;

#[derive(Debug, PartialEq, Eq, Clone, Hash, Serialize, Deserialize)]
pub enum MeaningIdx {
    Word(WordMeaningIdx),
    Name(NameReadingIdx),
}

#[derive(Debug, PartialEq, Eq, Clone, Hash, Serialize, Deserialize)]
pub struct WordMeaningIdx {
    entry_idx: WordEntryIdx,
    inner_idx: InnerWordMeaningIdx,
}

#[derive(Debug, PartialEq, Eq, Clone, Hash, Serialize, Deserialize)]
pub struct InnerWordMeaningIdx {
    /// Idx of sense within entry. Counts sense in each group
    sense_idx: usize,
    /// Idx of meaning within sense
    meaning_idx: usize,
}

#[derive(Debug, PartialEq, Eq, Clone, Hash, Serialize, Deserialize)]
pub struct NameReadingIdx {
    entry_idx: NameEntryIdx,
    inner_idx: InnerNameReadingIdx,
}

#[derive(Debug, PartialEq, Eq, Clone, Hash, Serialize, Deserialize)]
pub struct InnerNameReadingIdx {
    item_idx: usize,
}

impl EncodableIdx for MeaningIdx {}

impl MeaningIdx {
    pub fn entry_idx(&self) -> EntryIdx {
        match self {
            MeaningIdx::Word(idx) => idx.entry_idx.entry_idx(),
            MeaningIdx::Name(idx) => idx.entry_idx.entry_idx(),
        }
    }
}

pub(crate) struct MeaningIndexBuilder {
    map: HashMap<String, Vec<MeaningIdx>>,
    word_idx: u32,
    name_idx: u32,
}

impl MeaningIndexBuilder {
    pub fn new() -> Self {
        Self {
            map: HashMap::new(),
            word_idx: 0,
            name_idx: 0,
        }
    }

    pub fn with_capacity(capacity: usize) -> Self {
        Self {
            map: HashMap::with_capacity(capacity),
            word_idx: 0,
            name_idx: 0,
        }
    }

    /// Entries must be stored in the same order provided to this function
    pub fn add_word_entry(&mut self, entry: &WordEntry) {
        let mut sense_idx = 0;

        for grp in &entry.grouped_senses {
            for sense in &grp.senses {
                for (meaning_idx, meaning) in sense.meanings.iter().enumerate() {
                    let idx = MeaningIdx::Word(WordMeaningIdx {
                        entry_idx: WordEntryIdx(self.word_idx),
                        inner_idx: InnerWordMeaningIdx {
                            sense_idx,
                            meaning_idx,
                        },
                    });
                    let meaning_keys = generate_meaning_index_keys(&meaning);
                    for key in meaning_keys {
                        self.map
                            .entry(key)
                            .and_modify(|v| v.push(idx.clone()))
                            .or_insert_with(|| vec![idx.clone()]);
                    }
                }
                sense_idx += 1;
            }
        }
        self.word_idx += 1;
    }

    pub fn add_name_entry(&mut self, entry: &NameEntry) {
        let mut item_idx = 0;
        for grp in &entry.groups {
            for item in &grp.items {
                let idx = MeaningIdx::Name(NameReadingIdx {
                    entry_idx: NameEntryIdx(self.name_idx),
                    inner_idx: InnerNameReadingIdx { item_idx },
                });
                let reading_keys = generate_meaning_index_keys(&item.reading);
                for key in reading_keys {
                    self.map
                        .entry(key)
                        .and_modify(|v| v.push(idx.clone()))
                        .or_insert_with(|| vec![idx.clone()]);
                }
                item_idx += 1;
            }
        }
        self.name_idx += 1;
    }

    pub fn write_into<W: Write>(self, writer: &mut W) -> Result<()> {
        let items = self
            .map
            .into_iter()
            .map(|(key, idxs)| DictIndexItem {
                key,
                entry_indexes: idxs,
            })
            .sorted_by(|a, b| a.key.cmp(&b.key))
            .collect::<Vec<DictIndexItem<MeaningIdx>>>();
        DictIndexMap::build_and_encode_to(&items, writer)
    }
}

impl<'a> DictionaryView<'a> {
    pub fn search_meaning(&self, query: &str) -> Result<Vec<Entry>> {
        let words = generate_meaning_index_keys(&query);

        if words.is_empty() {
            return Ok(vec![]);
        }

        let mut idxs_arr: Vec<Vec<MeaningIdx>> = vec![];
        for word in words {
            let idxs = self.meaning_index.get(word)?;
            idxs_arr.push(idxs);
        }

        // Get intersection of meaning idxs for each index key word
        let meaning_idxs = {
            match idxs_arr.len() {
                0 => vec![],
                1 => idxs_arr.pop().unwrap(),
                _ => {
                    let last = idxs_arr.len() - 1;
                    for i in 0..last {
                        if idxs_arr[last].len() > idxs_arr[i].len() {
                            idxs_arr.swap(last, i);
                        }
                    }
                    let smallest_idxs = idxs_arr.pop().unwrap();
                    let mut intersection_idxs: HashSet<MeaningIdx> =
                        HashSet::from_iter(smallest_idxs);
                    for idxs in idxs_arr {
                        intersection_idxs.retain(|i| idxs.contains(i));
                    }
                    Vec::from_iter(intersection_idxs)
                }
            }
        };

        let mut ordering = meaning_idxs
            .iter()
            .map(|idx| {
                let entry_idx = idx.entry_idx();
                let order = match idx {
                    MeaningIdx::Word(idx) => MeaningSearchOrder::word(
                        &self.get_word_entry(&idx.entry_idx)?,
                        &idx.inner_idx,
                        &NFKCString::normalize(query),
                    )?,
                    MeaningIdx::Name(idx) => MeaningSearchOrder::name(
                        &self.get_name_entry(&idx.entry_idx)?,
                        &idx.inner_idx,
                        &NFKCString::normalize(query),
                    )?,
                };
                Ok((entry_idx, order))
            })
            .collect::<Result<Vec<_>>>()?;
        ordering.sort_by(|(_, a), (_, b)| a.cmp(b));

        let entry_idxs = ordering
            .into_iter()
            .map(|(idx, _)| idx)
            .dedup()
            .collect::<Vec<EntryIdx>>();
        let entries = self.get_entries(&entry_idxs)?;
        Ok(entries)
    }
}

#[derive(PartialEq, Eq, Debug, Clone)]
struct MeaningSearchOrder {
    /// Meaning contains full query as substring
    contains_full: bool,
    /// TODO: All index words (before removing diacritical marks) exist in meaning
    // all_words_as_is: bool,
    /// Length of meaning string
    meaning_len: usize,
    /// Priority of entry
    priority: u16,
}

impl MeaningSearchOrder {
    fn word(
        entry: &WordEntry,
        inner_idx: &InnerWordMeaningIdx,
        lowercase_query: &NFKCString,
    ) -> Result<Self> {
        let sense = entry
            .grouped_senses
            .iter()
            .flat_map(|g| g.senses.iter())
            .nth(inner_idx.sense_idx)
            .ok_or_else(|| Error::InvalidIndex("Sense index out of bounds".to_owned()))?;
        let meaning = sense
            .meanings
            .get(inner_idx.meaning_idx)
            .ok_or_else(|| Error::InvalidIndex("Meaning index out of bounds".to_owned()))?;

        let contains_full = meaning.contains(lowercase_query.as_str());
        let meaning_len = meaning.len();
        let priority = entry.priority;

        Ok(Self {
            contains_full,
            meaning_len,
            priority,
        })
    }

    fn name(
        entry: &NameEntry,
        inner_idx: &InnerNameReadingIdx,
        lowercase_query: &NFKCString,
    ) -> Result<Self> {
        let item = entry
            .groups
            .iter()
            .flat_map(|g| g.items.iter())
            .nth(inner_idx.item_idx)
            .ok_or_else(|| Error::InvalidIndex("Name item index out of bounds".to_owned()))?;
        let contains_full = item.reading.contains(lowercase_query.as_str());
        let meaning_len = item.reading.len();
        let priority = 0;

        Ok(Self {
            contains_full,
            meaning_len,
            priority,
        })
    }
}

impl Ord for MeaningSearchOrder {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        self.contains_full
            .cmp(&other.contains_full)
            .reverse()
            .then_with(|| self.meaning_len.cmp(&other.meaning_len))
            .then_with(|| self.priority.cmp(&other.priority).reverse())
    }
}

impl PartialOrd for MeaningSearchOrder {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

/// Returns true if `meaning` == `phrase`,
/// or if meaning contains content in parenthesis, content before parenthesis.
///
/// e.g. phrase "to kick" matches meaning "to kick (a ball)"
fn meaning_equals_phrase(meaning: &str, phrase: &str) -> bool {
    meaning.len() >= phrase.len()
        && meaning[0..phrase.len()] == *phrase
        && (meaning.len() == phrase.len()
            || matches!(
                meaning[phrase.len()..].trim_ascii_start().chars().next(),
                None | Some('(')
            ))
}

/// Split text into words and generate list of meaning index keys
fn generate_meaning_index_keys(text: &str) -> Vec<String> {
    let lowercased = text.to_lowercase();
    let normalized = NFKCString::normalize(lowercased);
    let basic_latin = normalize_latin_basic_form(&normalized);
    split_alphanumeric_words(&basic_latin)
        .into_iter()
        .map(|s| s.to_owned())
        .collect()
}

fn is_alphanumeric(ch: &char) -> bool {
    (*ch >= '\u{0061}' && *ch <= '\u{007A}' ) || // 'a' - 'z'
(*ch >= '\u{0041}' && *ch <= '\u{005A}' ) || // 'A' - 'Z'
(*ch >= '\u{0030}' && *ch <= '\u{0039}') // '0' - '9'
}

/// Retrieve words made of alphanumeric characters,
/// splitting at non-alphanumeric characters,
/// returning a vector of non-empty strs
fn split_alphanumeric_words(text: &str) -> Vec<&str> {
    text.split(|ch| !is_alphanumeric(&ch))
        .filter(|word| !word.is_empty())
        .collect()
}

/// Removes diacritic marks and decomposes some ligatures
fn normalize_latin_basic_form(text: &NFKCString) -> Cow<'_, str> {
    if is_nfkd(text) {
        Cow::Borrowed(text)
    } else {
        text.nfkd()
            .filter(is_not_diacritical_marks)
            .collect::<String>()
            .into()
    }
}

/// `ch` is not diacritic marks
fn is_not_diacritical_marks(ch: &char) -> bool {
    *ch < '\u{0300}' || *ch > '\u{036f}'
}

/// Remove text wrapped inside a parenthesis.
/// e.g. '(a) cat' -> 'cat', 'policy (procedure(s))' -> 'policy'
///
/// Whitespaces around parentheses are collapsed into one
fn remove_parenthesis(text: &str) -> Cow<'_, str> {
    let text_bytes = text.as_bytes();
    let mut it = memchr2_iter(b'(', b')', text_bytes);
    let mut level = 0;
    let mut chunk_start = 0;
    let mut chunk_end = 0;
    let mut removed = Vec::<u8>::new();
    // Space should be added before chunk-to-be-added.
    let mut space_before_chunk = false;

    for idx in &mut it {
        if text_bytes[idx] == b'(' {
            if level == 0 {
                chunk_end = idx;
            }
            level += 1;
        } else {
            // text_bytes[idx] == b')'
            if level > 1 {
                level -= 1;
            } else if level == 1 {
                level -= 1;
                let chunk = &text_bytes[chunk_start..chunk_end].trim_ascii();
                if !chunk.is_empty() {
                    if space_before_chunk && !removed.is_empty() {
                        removed.push(b' ');
                    }
                    removed.extend_from_slice(chunk);
                    space_before_chunk = false;
                }
                if chunk_end > 0 && text_bytes[chunk_end - 1] == b' ' {
                    space_before_chunk = true;
                }
                if idx + 1 < text_bytes.len() && text_bytes[idx + 1] == b' ' {
                    space_before_chunk = true;
                }
                chunk_start = idx + 1;
            }
        }
    }

    if chunk_start == 0 {
        text.into()
    } else {
        let chunk = &text_bytes[chunk_start..].trim_ascii();
        if !chunk.is_empty() {
            if space_before_chunk && !removed.is_empty() {
                removed.push(b' ');
            }
            removed.extend_from_slice(chunk);
        }
        String::from_utf8(removed)
            .expect("Must be valid UTF-8")
            .into()
    }
}

#[cfg(test)]
mod tests {
    mod remove_parenthesis_tests {
        use super::super::remove_parenthesis;

        #[test]
        fn basic() {
            let res = remove_parenthesis("cat (meow)");
            assert_eq!(res, "cat");
        }

        #[test]
        fn trim_space() {
            let res = remove_parenthesis("(a) cat jump over (the) (hard-)(ware)house (roof)");
            assert_eq!(res, "cat jump over house");
        }

        #[test]
        fn without_space() {
            let res = remove_parenthesis("cat(s) colo(u)r (pre-)market(s)");
            assert_eq!(res, "cat color market");
        }

        #[test]
        fn multi_level() {
            let res = remove_parenthesis("cat (meow (loudly (not silently)))");
            assert_eq!(res, "cat");
        }

        #[test]
        fn no_remove() {
            let res = remove_parenthesis(")-(");
            assert_eq!(res, ")-(")
        }
    }
}
