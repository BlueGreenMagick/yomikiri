use std::collections::HashMap;
use std::fmt::Debug;
use std::io::Write;
use std::marker::PhantomData;
use std::ops::Deref;

use fst::{IntoStreamer, MapBuilder, Streamer};
use itertools::Itertools;
use serde::de::Error as DeserializeError;
use serde::{Deserialize, Serialize};

use crate::entry::NameEntry;
use crate::error::Result;
use crate::WordEntry;

/// Trait that all dictionary index types implement
pub trait EncodableIdx: Sized + Debug + Serialize + for<'de> Deserialize<'de> {}

#[derive(Debug, PartialEq, Eq, Clone, Copy, Hash)]
pub enum EntryIdx {
    Word(WordEntryIdx),
    Name(NameEntryIdx),
}

#[derive(Debug, PartialEq, Eq, Clone, Copy, Hash, Serialize, Deserialize)]
pub struct WordEntryIdx(pub(crate) u32);

#[derive(Debug, PartialEq, Eq, Clone, Copy, Hash, Serialize, Deserialize)]
pub struct NameEntryIdx(pub(crate) u32);

impl WordEntryIdx {
    pub fn entry_idx(self) -> EntryIdx {
        EntryIdx::Word(self)
    }
}

impl NameEntryIdx {
    pub fn entry_idx(self) -> EntryIdx {
        EntryIdx::Name(self)
    }
}

impl Serialize for EntryIdx {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let transform = match self {
            EntryIdx::Word(idx) => idx.0 * 2,
            EntryIdx::Name(idx) => idx.0 * 2 + 1,
        };
        serializer.serialize_u32(transform)
    }
}

impl<'de> Deserialize<'de> for EntryIdx {
    fn deserialize<D>(deserializer: D) -> std::result::Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let transform = u32::deserialize(deserializer)?;
        if transform % 2 == 0 {
            Ok(EntryIdx::Word(WordEntryIdx(transform / 2)))
        } else {
            Ok(EntryIdx::Name(NameEntryIdx((transform - 1) / 2)))
        }
    }
}

impl EncodableIdx for EntryIdx {}

/// Multiple jmdict entry indexes that corresponds to a key
#[derive(Debug)]
pub struct DictIndexItem<T: EncodableIdx> {
    pub key: String,
    /// Sorted
    pub entry_indexes: Vec<T>,
}

/// Because `fst::Map` can only store 1 u64 as value.
/// when multiple indexes are associated with a key,
/// they are stored separately in `idxs_storage` as contiguous bytes,
/// and the map stores its starting byte position.
///
/// When the value is a single index that fit within 63bit,
/// it is stored directly within the map as little-endian.
///
/// When decoding, if the MSB is 0, it is a single index,
/// otherwise the starting byte position within `idxs_storage``.
#[derive(Serialize, Deserialize)]
pub struct DictIndexMap<'a, T: EncodableIdx> {
    #[serde(borrow)]
    map: Map<'a>,
    #[serde(borrow)]
    idxs_storage: &'a [u8],
    #[serde(skip)]
    _typ: PhantomData<T>,
}

pub struct Map<'a>(pub fst::Map<&'a [u8]>);

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

impl<'a, T: EncodableIdx> DictIndexMap<'a, T> {
    pub fn get<K: AsRef<[u8]>>(&self, key: K) -> Result<Vec<T>> {
        if let Some(value) = self.map.get(key) {
            self.parse_value(value)
        } else {
            Ok(vec![])
        }
    }

    pub fn contains_key<K: AsRef<[u8]>>(&self, key: K) -> bool {
        self.map.contains_key(key)
    }

    /// Returns `true` if index map contains any key that starts with prefix, and is not prefix.
    ///
    /// e.g. If index map contains a single key "abcd":
    /// - returns `true` for `prefix = "abc"`
    /// - returns `false` for `prefix = "abcd"`
    pub fn has_starts_with_excluding<K: AsRef<[u8]>>(&self, prefix: K) -> bool {
        let mut next_prefix_bytes = prefix.as_ref().to_vec();
        increment_bytes(&mut next_prefix_bytes);

        self.map
            .range()
            .gt(prefix)
            .lt(&next_prefix_bytes)
            .into_stream()
            .next()
            .is_some()
    }

    pub fn try_decode(source: &'a [u8]) -> Result<(Self, usize)> {
        let start = source.len();
        let (idx_map, rest) = postcard::take_from_bytes(source)?;
        Ok((idx_map, start - rest.len()))
    }

    fn parse_value(&self, value: u64) -> Result<Vec<T>> {
        if value & (1_u64 << 63) == 0 {
            let idx: T = postcard::from_bytes(&value.to_le_bytes())?;
            Ok(vec![idx])
        } else {
            let idx = (value & ((1_u64 << 63) - 1)) as usize;
            let idxs = postcard::from_bytes::<Vec<T>>(&self.idxs_storage[idx..])?;
            Ok(idxs)
        }
    }

    pub(crate) fn build_and_encode_to<W: Write>(
        items: &[DictIndexItem<T>],
        writer: &mut W,
    ) -> Result<()> {
        let mut buffer = Vec::with_capacity(16 * items.len());
        let mut builder = MapBuilder::new(&mut buffer)?;
        // stores arrays of indexes contiguously
        let mut idxs_storage: Vec<u8> = vec![];

        for item in items {
            if item.entry_indexes.len() == 1 {
                let index = &item.entry_indexes[0];
                let encoded = postcard::to_stdvec(&index)?;
                if let Some(val) = single_storable(&encoded) {
                    builder.insert(&item.key, val)?;
                    continue;
                }
            }
            // Store idxes into separate array, and store index within array as fst::map value
            let mut term_ids: Vec<&T> = vec![];
            for index in &item.entry_indexes {
                term_ids.push(index);
            }
            debug_assert!((idxs_storage.len() as u64) < (1_u64 << 63));
            builder.insert(&item.key, 1_u64 << 63 | idxs_storage.len() as u64)?;
            postcard::to_io(&term_ids, &mut idxs_storage)?;
        }
        builder.finish()?;

        let idx_map: DictIndexMap<T> = DictIndexMap {
            map: Map::new(&buffer)?,
            idxs_storage: &idxs_storage,
            _typ: PhantomData,
        };
        postcard::to_io(&idx_map, &mut *writer)?;
        Ok(())
    }
}

pub(crate) fn create_sorted_term_indexes(
    name_entries: &[NameEntry],
    entries: &[WordEntry],
) -> Result<Vec<DictIndexItem<EntryIdx>>> {
    // some entries have multiple terms
    let mut indexes: HashMap<&str, Vec<EntryIdx>> = HashMap::with_capacity(entries.len() * 4);

    for (i, entry) in entries.iter().enumerate() {
        for term in entry
            .kanjis
            .iter()
            .map(|k| &k.kanji)
            .chain(entry.readings.iter().map(|r| &r.reading))
        {
            let idx = WordEntryIdx(i as u32).entry_idx();
            indexes
                .entry(term)
                .and_modify(|v| v.push(idx))
                .or_insert_with(|| vec![idx]);
        }
    }

    for (i, entry) in name_entries.iter().enumerate() {
        let idx = NameEntryIdx(i as u32).entry_idx();
        let term = &entry.kanji;
        indexes
            .entry(term)
            .and_modify(|v| v.push(idx))
            .or_insert_with(|| vec![idx]);
    }

    let indexes: Vec<DictIndexItem<EntryIdx>> = indexes
        .into_iter()
        .map(|(term, indexes)| DictIndexItem {
            key: term.to_string(),
            entry_indexes: indexes,
        })
        .sorted_by(|a, b| a.key.cmp(&b.key))
        .collect();

    Ok(indexes)
}

fn increment_bytes(bytes: &mut Vec<u8>) {
    let mut i = bytes.len();
    loop {
        if i > 0 {
            i -= 1;
        } else {
            break;
        }
        if bytes[i] == 255 {
            bytes[i] = 0;
        } else {
            bytes[i] += 1;
            return;
        }
    }
    bytes.push(0);
}

/// Returns Some(u64) if the bytes can be stored within 63 bits.
/// Either `bytes.len() < 7`, or its length is 8 bytes and MSB is 0.
///
/// Returned value is little-endian encoded value.
fn single_storable(bytes: &[u8]) -> Option<u64> {
    if bytes.len() <= 7 {
        let mut value = [0u8; 8];
        value[..bytes.len()].copy_from_slice(bytes);
        Some(u64::from_le_bytes(value))
    } else if bytes.len() == 8 && bytes[7] & (1_u8 << 7) == 0 {
        Some(u64::from_le_bytes(bytes.try_into().unwrap()))
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::increment_bytes;

    #[test]
    fn test_increment_bytes() {
        macro_rules! test_case {
            ($in: expr, $out: expr) => {
                let mut next = $in.to_vec();
                increment_bytes(&mut next);
                assert_eq!(&next, $out);
            };
        }

        test_case!(b"a", b"b");
        test_case!(b"art", b"aru");
        test_case!(b"a\xff", b"b\x00");
        test_case!(b"\xff\xff", b"\x00\x00\x00");
        test_case!(b"", b"\x00");
    }
}
