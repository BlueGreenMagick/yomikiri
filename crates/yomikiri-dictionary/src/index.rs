use std::collections::HashMap;

use byteorder::{LittleEndian, ReadBytesExt};
use fst::Map;
use itertools::Itertools;
use ouroboros::self_referencing;
use serde::{Deserialize, Serialize};

use crate::error::Result;
use crate::jagged_array::JaggedArray;
use crate::Entry;

#[self_referencing]
pub struct DictIndex<K: AsRef<[u8]> + 'static> {
    source: Box<K>,
    #[borrows(source)]
    #[covariant]
    pub view: DictIndexView<'this>,
}

pub struct DictIndexView<'a> {
    pub terms: DictIndexMap<'a>,
}

/// Locations of multiple jmdict entries for a single term in .yomikiridict
#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct DictTermIndex {
    pub term: String,
    /// Sorted
    pub entry_indexes: Vec<usize>,
}

/// map values are u64 with structure:
/// | literal '0' | entry idx (63) |
/// | literal '1' | '0' * 31 | pointers array index (32) |
pub struct DictIndexMap<'a> {
    pub map: Map<&'a [u8]>,
    pub pointers: JaggedArray<'a, Vec<usize>>,
}

impl<'a> DictIndexMap<'a> {
    pub fn parse_value(&self, value: u64) -> Result<Vec<usize>> {
        let idx = (value & ((1_u64 << 63) - 1)) as usize;
        if value >= 1_u64 << 63 {
            self.pointers.get(idx)
        } else {
            Ok(vec![idx])
        }
    }
}

impl<'a> DictIndexView<'a> {
    pub fn try_new(source: &'a [u8]) -> Result<Self> {
        let bytes = source.as_ref();
        let mut at = 0;

        let len = (&bytes[at..at + 4]).read_u32::<LittleEndian>()? as usize;
        at += 4;
        let term_map = Map::new(&bytes[at..at + len])?;
        at += len;

        let (term_pointers, _len) = JaggedArray::decode_from_bytes(&bytes[at..])?;
        // at += len;

        let terms = DictIndexMap {
            map: term_map,
            pointers: term_pointers,
        };

        Ok(Self { terms })
    }
}

impl<K: AsRef<[u8]>> DictIndex<K> {
    pub fn try_from_source(source: K) -> Result<Self> {
        let builder = DictIndexTryBuilder {
            source: Box::new(source),
            view_builder: |source| DictIndexView::try_new(source.as_ref()),
        };
        builder.try_build()
    }
}

pub(crate) fn create_sorted_term_indexes(entries: &[Entry]) -> Result<Vec<DictTermIndex>> {
    // some entries have multiple terms
    let mut indexes: HashMap<&str, Vec<usize>> = HashMap::with_capacity(entries.len() * 4);

    for (i, entry) in entries.iter().enumerate() {
        for term in entry.terms() {
            indexes
                .entry(term)
                .and_modify(|v| v.push(i))
                .or_insert_with(|| vec![]);
        }
    }

    let indexes: Vec<DictTermIndex> = indexes
        .into_iter()
        .map(|(term, indexes)| DictTermIndex {
            term: term.to_string(),
            entry_indexes: indexes,
        })
        .sorted_by(|a, b| a.term.cmp(&b.term))
        .collect();

    Ok(indexes)
}
