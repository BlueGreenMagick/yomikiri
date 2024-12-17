use std::borrow::Cow;
use std::collections::{HashMap, HashSet};
use std::hash::Hash;
use std::io::Write;

use itertools::Itertools;
use memchr::memchr2_iter;
use serde::{Deserialize, Serialize};
use unicode_normalization::UnicodeNormalization;

use crate::dictionary::DictionaryView;
use crate::entry::{Entry, NameEntry, WordEntry};
use crate::error::Result;
use crate::index::{
    DictIndexItem, DictIndexMap, EncodableIdx, EntryIdx, NameEntryIdx, WordEntryIdx,
};
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
                    let normalized = normalize_meaning(&meaning);
                    let meaning_keys = split_meaning_index_words(&normalized);
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
                let normalized = normalize_meaning(&item.reading);
                let reading_keys = split_meaning_index_words(&normalized);
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
        let normalized = normalize_meaning(query);
        let words = split_meaning_index_words(&normalized);

        if words.is_empty() {
            return Ok(vec![]);
        }

        let mut idxs_arr: Vec<Vec<MeaningIdx>> = vec![];
        for word in &words {
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

        let order_calc = MeaningSearchOrderCalculator::new(&normalized, &words);

        let mut ordering = meaning_idxs
            .iter()
            .map(|idx| {
                let entry_idx = idx.entry_idx();
                Ok(match idx {
                    MeaningIdx::Word(idx) => {
                        let entry = self.get_word_entry(&idx.entry_idx)?;
                        let order = order_calc.calc_word(&entry, &idx.inner_idx)?;
                        (entry_idx, Entry::Word(entry), order)
                    }
                    MeaningIdx::Name(idx) => {
                        let entry = self.get_name_entry(&idx.entry_idx)?;
                        let order = order_calc.calc_name(&entry, &idx.inner_idx)?;
                        (entry_idx, Entry::Name(entry), order)
                    }
                })
            })
            .collect::<Result<Vec<_>>>()?;

        // sort reverse order
        ordering
            .sort_by(|(_, _, a), (_, _, b)| b.partial_cmp(a).unwrap_or(std::cmp::Ordering::Less));

        let entries = ordering
            .into_iter()
            .dedup_by(|(idx, _, _), (idx2, _, _)| idx == idx2)
            .map(|(_, entry, _)| entry)
            .collect::<Vec<Entry>>();

        Ok(entries)
    }
}

#[derive(PartialEq, Debug, Clone, PartialOrd)]
struct MeaningSearchOrder {
    /// Search query contains parenthesis and is identical to meaning
    identical_parenthesis: bool,
    /// Unparenthesized search query is identical to unparenthesized meaning
    identical_unparenthesized: bool,
    /// Number of Words in query and meaning / Total words in unparenthesized meaning
    words_in_query_and_meaning_ratio: f32,
    /// Priority of entry
    priority: u16,
}

struct MeaningSearchOrderCalculator<'a> {
    normalized: &'a str,
    unparenthesized: Cow<'a, str>,
    /// words in search query
    words: &'a [String],
}

impl<'a> MeaningSearchOrderCalculator<'a> {
    fn new(normalized: &'a str, words: &'a [String]) -> Self {
        Self {
            normalized,
            unparenthesized: remove_parenthesis(normalized),
            words,
        }
    }

    pub fn calc_word(
        &self,
        entry: &WordEntry,
        inner_idx: &InnerWordMeaningIdx,
    ) -> Result<MeaningSearchOrder> {
        let meaning = Self::word_meaning(entry, inner_idx)?;
        self.calc_inner(meaning, entry.priority)
    }

    pub fn calc_name(
        &self,
        entry: &NameEntry,
        inner_idx: &InnerNameReadingIdx,
    ) -> Result<MeaningSearchOrder> {
        let reading = Self::name_reading(entry, inner_idx)?;
        self.calc_inner(reading, 0)
    }

    fn calc_inner(&self, meaning: &str, priority: u16) -> Result<MeaningSearchOrder> {
        let normalized = normalize_meaning(meaning);
        let unparenthesized = remove_parenthesis(&normalized);

        let query_contains_parenthesis = self.normalized != self.unparenthesized;
        let identical_parenthesis =
            query_contains_parenthesis && self.normalized == normalized.as_str();
        let identical_unparenthesized = self.unparenthesized == unparenthesized;
        let words_in_query_and_meaning_ratio = self.calculate_word_ratio(&unparenthesized);

        Ok(MeaningSearchOrder {
            identical_parenthesis,
            identical_unparenthesized,
            words_in_query_and_meaning_ratio,
            priority: priority,
        })
    }

    // `unparenthesized` is normalized unparenthesized meaning
    fn calculate_word_ratio(&self, unparenthesized: &str) -> f32 {
        let meaning_words = split_meaning_index_words(unparenthesized);
        let intersection_cnt = common_entries_count(&self.words, &meaning_words);
        intersection_cnt as f32 / meaning_words.len() as f32
    }

    fn word_meaning<'e>(entry: &'e WordEntry, inner_idx: &InnerWordMeaningIdx) -> Result<&'e str> {
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
        Ok(meaning)
    }

    fn name_reading<'e>(
        entry: &'e NameEntry,
        inner_idx: &'e InnerNameReadingIdx,
    ) -> Result<&'e str> {
        let item = entry
            .groups
            .iter()
            .flat_map(|g| g.items.iter())
            .nth(inner_idx.item_idx)
            .ok_or_else(|| Error::InvalidIndex("Name item index out of bounds".to_owned()))?;
        Ok(&item.reading)
    }
}

/// Split text into words and generate list of unique meaning index keys
fn split_meaning_index_words(normalized: &str) -> Vec<String> {
    split_alphanumeric_words(&normalized)
        .into_iter()
        .unique()
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

/// Normalize text used for entry meaning.
///
/// 1. Lowercases text
/// 2. Removes diacritic marks
/// 3. Returns NFKC normalized string
fn normalize_meaning(meaning: &str) -> String {
    let text = meaning.to_lowercase();
    text.nfkd()
        .filter(is_not_diacritical_marks)
        .nfkc()
        .collect()
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

/// Returns number of entries in `b` that also exist in `a`.
fn common_entries_count<T: Eq + Hash>(a: &[T], b: &[T]) -> usize {
    let set_a: HashSet<_> = a.iter().collect();
    b.iter().filter(|&item| set_a.contains(item)).count()
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
