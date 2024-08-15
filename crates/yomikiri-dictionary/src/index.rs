use std::collections::HashMap;
use std::io::Write;

use byteorder::{LittleEndian, ReadBytesExt, WriteBytesExt};
use fst::{Map, MapBuilder};
use itertools::Itertools;
use serde::{Deserialize, Serialize};

use crate::error::Result;
use crate::jagged_array::JaggedArray;
use crate::Entry;

/// Multiple jmdict entry indexes that corresponds to a key
#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct DictIndexItem {
    pub key: String,
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
    pub fn try_decode(source: &'a [u8]) -> Result<(Self, usize)> {
        let bytes = source.as_ref();
        let mut at = 0;

        let len = (&bytes[at..at + 4]).read_u32::<LittleEndian>()? as usize;
        at += 4;
        let term_map = Map::new(&bytes[at..at + len])?;
        at += len;

        let (term_pointers, len) = JaggedArray::try_decode(&bytes[at..])?;
        at += len;

        let terms = DictIndexMap {
            map: term_map,
            pointers: term_pointers,
        };

        Ok((terms, at))
    }

    pub fn parse_value(&self, value: u64) -> Result<Vec<usize>> {
        let idx = (value & ((1_u64 << 63) - 1)) as usize;
        if value >= 1_u64 << 63 {
            self.pointers.get(idx)
        } else {
            Ok(vec![idx])
        }
    }

    pub(crate) fn build_and_encode_to<W: Write>(
        items: &[DictIndexItem],
        writer: &mut W,
    ) -> Result<()> {
        let mut buffer = Vec::with_capacity(16 * items.len());
        let mut builder = MapBuilder::new(&mut buffer)?;
        let mut pointers: Vec<Vec<usize>> = vec![];

        for item in items {
            if item.entry_indexes.len() == 1 {
                let index = item.entry_indexes[0] as u64;
                builder.insert(&item.key, index)?;
            } else {
                let mut term_ids: Vec<usize> = vec![];
                for index in &item.entry_indexes {
                    term_ids.push(*index);
                }
                builder.insert(
                    &item.key,
                    1_u64 << 63 | (pointers.len() as u64 & ((1_u64 << 32) - 1)),
                )?;
                pointers.push(term_ids);
            }
        }
        builder.finish()?;

        writer.write_u32::<LittleEndian>(buffer.len().try_into()?)?;
        writer.write_all(&mut buffer)?;

        JaggedArray::build_and_encode_to(&pointers, writer)?;
        Ok(())
    }
}

pub(crate) fn create_sorted_term_indexes(entries: &[Entry]) -> Result<Vec<DictIndexItem>> {
    // some entries have multiple terms
    let mut indexes: HashMap<&str, Vec<usize>> = HashMap::with_capacity(entries.len() * 4);

    for (i, entry) in entries.iter().enumerate() {
        for term in entry.terms() {
            indexes
                .entry(term)
                .and_modify(|v| v.push(i))
                .or_insert_with(|| vec![i]);
        }
    }

    let indexes: Vec<DictIndexItem> = indexes
        .into_iter()
        .map(|(term, indexes)| DictIndexItem {
            key: term.to_string(),
            entry_indexes: indexes,
        })
        .sorted_by(|a, b| a.key.cmp(&b.key))
        .collect();

    Ok(indexes)
}
