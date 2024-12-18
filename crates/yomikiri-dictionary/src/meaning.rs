use std::borrow::Cow;
use std::collections::{HashMap, HashSet};
use std::hash::Hash;

use itertools::Itertools;
use memchr::memchr2_iter;
use serde::{Deserialize, Serialize};
use unicode_normalization::UnicodeNormalization;

use crate::dictionary::DictionaryView;
use crate::entry::{Entry, WordEntry};
use crate::error::Result;
use crate::index::{DictIndexItem, EncodableIdx, EntryIdx, WordEntryIdx};
use crate::Error;

#[derive(Debug, PartialEq, Eq, Clone, Hash, Serialize, Deserialize)]
pub struct MeaningIdx {
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

impl EncodableIdx for MeaningIdx {}

impl MeaningIdx {
    pub fn entry_idx(&self) -> EntryIdx {
        self.entry_idx.entry_idx()
    }
}

pub fn create_meaning_indexes(entries: &[WordEntry]) -> Result<Vec<DictIndexItem<MeaningIdx>>> {
    let mut map: HashMap<String, Vec<MeaningIdx>> = HashMap::new();

    for (word_idx, entry) in entries.iter().enumerate() {
        let mut sense_idx = 0;

        for grp in &entry.grouped_senses {
            for sense in &grp.senses {
                for (meaning_idx, meaning) in sense.meanings.iter().enumerate() {
                    let idx = MeaningIdx {
                        entry_idx: WordEntryIdx(word_idx as u32),
                        inner_idx: InnerWordMeaningIdx {
                            sense_idx,
                            meaning_idx,
                        },
                    };
                    let normalized = normalize_meaning(meaning);
                    let meaning_keys = split_meaning_index_words(&normalized);
                    for key in meaning_keys {
                        map.entry(key)
                            .and_modify(|v| v.push(idx.clone()))
                            .or_insert_with(|| vec![idx.clone()]);
                    }
                }
                sense_idx += 1;
            }
        }
    }

    let items = map
        .into_iter()
        .map(|(key, idxs)| DictIndexItem {
            key,
            entry_indexes: idxs,
        })
        .sorted_by(|a, b| a.key.cmp(&b.key))
        .collect::<Vec<DictIndexItem<MeaningIdx>>>();
    Ok(items)
}

impl DictionaryView<'_> {
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
                let entry = self.get_word_entry(&idx.entry_idx)?;
                let order = order_calc.calc(&entry, &idx.inner_idx)?;
                Ok((entry_idx, Entry::Word(entry), order))
            })
            .collect::<Result<Vec<_>>>()?;

        // sort reverse order
        ordering.sort_by(|(idx_a, _, a), (idx_b, _, b)| {
            b.partial_cmp(a)
                .unwrap_or(std::cmp::Ordering::Less)
                // sort by entry_idx for deterministic order
                .then(idx_a.cmp(idx_b))
        });

        let mut entries = Vec::with_capacity(ordering.len());
        let mut entry_ids = HashSet::with_capacity(ordering.len() * 2);

        for (idx, entry, _) in ordering {
            if !entry_ids.contains(&idx) {
                entries.push(entry);
                entry_ids.insert(idx);
            }
        }

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
    /// Is first (main) meaning in first sense of entry
    first_meaning: bool,
    /// Is first (main) sense in entry
    first_sense: bool,
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

    pub fn calc(
        &self,
        entry: &WordEntry,
        inner_idx: &InnerWordMeaningIdx,
    ) -> Result<MeaningSearchOrder> {
        let meaning = Self::word_meaning(entry, inner_idx)?;
        let normalized = normalize_meaning(meaning);
        let unparenthesized = remove_parenthesis(&normalized);

        let query_contains_parenthesis = self.normalized != self.unparenthesized;
        let identical_parenthesis =
            query_contains_parenthesis && self.normalized == normalized.as_str();
        let identical_unparenthesized = self.unparenthesized == unparenthesized;
        let words_in_query_and_meaning_ratio = self.words_ratio(&unparenthesized);
        let first_sense = inner_idx.sense_idx == 0;
        let first_meaning = first_sense && inner_idx.meaning_idx == 0;

        Ok(MeaningSearchOrder {
            identical_parenthesis,
            identical_unparenthesized,
            words_in_query_and_meaning_ratio,
            first_sense,
            first_meaning,
            priority: entry.priority,
        })
    }

    // `unparenthesized` is normalized unparenthesized meaning
    fn words_ratio(&self, unparenthesized: &str) -> f32 {
        let meaning_words = split_meaning_index_words(unparenthesized);
        let intersection_cnt = common_entries_count(self.words, &meaning_words);
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
}

/// Split text into words and generate list of unique meaning index keys
fn split_meaning_index_words(normalized: &str) -> Vec<String> {
    split_alphanumeric_words(normalized)
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
            match level {
                2.. => {
                    level -= 1;
                }
                1 => {
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
                _ => {}
            };
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
