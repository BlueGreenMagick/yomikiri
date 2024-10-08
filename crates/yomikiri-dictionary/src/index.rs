use std::collections::HashMap;
use std::io::Write;
use std::ops::Deref;

use byteorder::{LittleEndian, ReadBytesExt, WriteBytesExt};
use fst::MapBuilder;
use itertools::Itertools;
use serde::de::Error as DeserializeError;
use serde::{Deserialize, Serialize};

use crate::entry::NameEntry;
use crate::error::Result;
use crate::jagged_array::JaggedArray;
use crate::WordEntry;

/// If first bit is 0, word entry pointer, otherwise name entry pointer.
///
/// Structure:
/// | '0' | word entry idx (31) |
/// | '1' | name entry idx (31) |
#[derive(Debug, PartialEq, Eq, Serialize, Deserialize, Clone, Copy)]
pub(crate) struct StoredEntryPointer(u32);

#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub enum EntryPointer {
    Word(u32),
    Name(u32),
}

/// Multiple jmdict entry indexes that corresponds to a key
#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct DictIndexItem {
    pub key: String,
    /// Sorted
    pub entry_indexes: Vec<StoredEntryPointer>,
}

/// map values are u64 with structure:
/// | literal '0' | '0' * 31 | StoredEntryPointer (32) |
/// | literal '1' | '0' * 31 | pointers array index (32) |
#[derive(Serialize, Deserialize)]
pub struct DictIndexMap<'a> {
    #[serde(borrow)]
    pub map: Map<'a>,
    pointers: JaggedArray<'a, Vec<StoredEntryPointer>>,
}

pub struct Map<'a>(pub fst::Map<&'a [u8]>);

impl From<StoredEntryPointer> for EntryPointer {
    fn from(value: StoredEntryPointer) -> Self {
        let inner = value.0;
        let idx = inner & ((1_u32 << 31) - 1_u32);
        if inner >= (1_u32 << 31) {
            EntryPointer::Name(idx)
        } else {
            EntryPointer::Word(idx)
        }
    }
}

impl From<EntryPointer> for StoredEntryPointer {
    fn from(value: EntryPointer) -> Self {
        let inner = match value {
            EntryPointer::Word(idx) => idx & ((1_u32 << 31) - 1),
            EntryPointer::Name(idx) => 1_u32 << 31 | (idx & ((1_u32 << 31) - 1)),
        };
        StoredEntryPointer(inner)
    }
}

impl From<u32> for StoredEntryPointer {
    fn from(value: u32) -> Self {
        Self(value)
    }
}

impl<'a> Deref for Map<'a> {
    type Target = fst::Map<&'a [u8]>;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl<'a> Map<'a> {
    fn new(bytes: &'a [u8]) -> fst::Result<Self> {
        fst::Map::new(bytes).map(Self)
    }
}

impl<'a> Serialize for Map<'a> {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_bytes(self.0.as_fst().as_inner())
    }
}

impl<'a, 'de> Deserialize<'de> for Map<'a>
where
    'de: 'a,
{
    fn deserialize<D>(deserializer: D) -> std::result::Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let bytes = <&'a [u8]>::deserialize(deserializer)?;
        Self::new(bytes).map_err(DeserializeError::custom)
    }
}

impl<'a> DictIndexMap<'a> {
    pub fn try_decode(source: &'a [u8]) -> Result<(Self, usize)> {
        let bytes = source;
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

    pub fn parse_value(&self, value: u64) -> Result<Vec<EntryPointer>> {
        let idx = (value & ((1_u64 << 63) - 1)) as usize;
        if value >= 1_u64 << 63 {
            Ok(self
                .pointers
                .get(idx)?
                .iter()
                .map(|i| EntryPointer::from(*i))
                .collect())
        } else {
            let stored_pointer = StoredEntryPointer(idx as u32);
            let pointer = EntryPointer::from(stored_pointer);
            Ok(vec![pointer])
        }
    }

    pub(crate) fn build_and_encode_to<W: Write>(
        items: &[DictIndexItem],
        writer: &mut W,
    ) -> Result<()> {
        let mut buffer = Vec::with_capacity(16 * items.len());
        let mut builder = MapBuilder::new(&mut buffer)?;
        let mut pointers: Vec<Vec<u32>> = vec![];

        for item in items {
            if item.entry_indexes.len() == 1 {
                let index = item.entry_indexes[0].0 as u64;
                builder.insert(&item.key, index)?;
            } else {
                let mut term_ids: Vec<u32> = vec![];
                for index in &item.entry_indexes {
                    term_ids.push(index.0);
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
        writer.write_all(&buffer)?;

        JaggedArray::build_and_encode_to(&pointers, writer)?;
        Ok(())
    }
}

pub(crate) fn create_sorted_term_indexes(
    name_entries: &[NameEntry],
    entries: &[WordEntry],
) -> Result<Vec<DictIndexItem>> {
    // some entries have multiple terms
    let mut indexes: HashMap<&str, Vec<StoredEntryPointer>> =
        HashMap::with_capacity(entries.len() * 4);

    for (i, entry) in entries.iter().enumerate() {
        for term in entry
            .kanjis
            .iter()
            .map(|k| &k.kanji)
            .chain(entry.readings.iter().map(|r| &r.reading))
        {
            let pointer: StoredEntryPointer = EntryPointer::Word(i as u32).into();
            indexes
                .entry(term)
                .and_modify(|v| v.push(pointer))
                .or_insert_with(|| vec![pointer]);
        }
    }

    for (i, entry) in name_entries.iter().enumerate() {
        let pointer: StoredEntryPointer = EntryPointer::Name(i as u32).into();
        let term = &entry.kanji;
        indexes
            .entry(term)
            .and_modify(|v| v.push(pointer))
            .or_insert_with(|| vec![pointer]);
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
