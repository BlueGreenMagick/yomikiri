use std::borrow::Cow;
use std::collections::{HashMap, HashSet};
use std::io::Write;

use itertools::Itertools;
use serde::{Deserialize, Serialize};
use unicode_normalization::{is_nfkd, UnicodeNormalization};

use crate::dictionary::DictionaryView;
use crate::entry::{Entry, NameEntry, WordEntry};
use crate::error::Result;
use crate::index::{
    DictIndexItem, DictIndexMap, EncodableIdx, EntryIdx, NameEntryIdx, WordEntryIdx,
};
use crate::utils::NFKCString;

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

        let entry_idxs = meaning_idxs
            .iter()
            .map(|m| m.entry_idx())
            .dedup()
            .collect::<Vec<EntryIdx>>();

        let entries = self.get_entries(&entry_idxs)?;
        Ok(entries)
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
