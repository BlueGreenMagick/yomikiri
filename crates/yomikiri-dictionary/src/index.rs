use byteorder::{LittleEndian, ReadBytesExt};
use fst::Map;
use ouroboros::self_referencing;

use crate::error::Result;
use crate::file::DictEntryPointer;
use crate::jagged_array::JaggedArray;

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

/// map values are u64 with structure:
/// | literal '0' | '0' * 15 | chunk index (32) | inner index (16) |
/// | literal '1' | '0' * 31 | pointers array index (32) |
pub struct DictIndexMap<'a> {
    pub map: Map<&'a [u8]>,
    pub pointers: JaggedArray<'a, Vec<DictEntryPointer>>,
}

impl<'a> DictIndexMap<'a> {
    pub fn parse_value(&self, value: u64) -> Result<Vec<DictEntryPointer>> {
        if value >= 1_u64 << 63 {
            let idx = (value & ((1_u64 << 32) - 1)) as usize;
            self.pointers.get(idx)
        } else {
            let chunk_index = (value >> 16) as u32;
            let inner_index = (value & ((1_u64 << 16) - 1)) as u16;
            let entry_index = DictEntryPointer {
                chunk_index,
                inner_index,
            };
            Ok(vec![entry_index])
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

        let len = (&bytes[at..at + 4]).read_u32::<LittleEndian>()? as usize;
        at += 4;
        let term_pointers = JaggedArray::try_new(&bytes[at..at + len])?;
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
