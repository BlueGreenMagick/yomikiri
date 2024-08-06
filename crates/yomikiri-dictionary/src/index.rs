use byteorder::{LittleEndian, ReadBytesExt, WriteBytesExt};
use fst::Map;
use ouroboros::self_referencing;

use crate::error::Result;
use crate::file::DictEntryPointer;
use crate::Error;

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
    pub pointers: DictIndexPointers<'a>,
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

/// Vec<Vec<DictEntryPointer>> that reads from byte slice without copy
/// Inner vec can hold up to 2^32 items, and 2^33 items in total.
///
/// Structure (bytes):
/// 1. pointers to array
///     - len (8)
///     repeated 'len' times:
///         - vec pointer (4): byte-position of pointer / 2 (first is 0)
///     - byte length of vec pointers / 2 (4)
/// 2. arrays of pointers to entry
///     repeated:
///         repeated 'len' times:
///             - chunk index (4)
///             - inner index (2)
pub struct DictIndexPointers<'a> {
    data: &'a [u8],
    len: usize,
}

impl<'a> DictIndexPointers<'a> {
    pub fn get(&self, index: usize) -> Result<Vec<DictEntryPointer>> {
        if index >= self.len {
            return Err(Error::OutOfRange);
        }

        let (pointer_vec_start, pointer_vec_end) = self.vec_pointer_position(index)?;

        debug_assert!((pointer_vec_end - pointer_vec_start) % 6 == 0);
        let len = (pointer_vec_end - pointer_vec_start) / 6;
        let mut pointers: Vec<DictEntryPointer> = Vec::with_capacity(len);

        let mut at = pointer_vec_start;
        while at < pointer_vec_end {
            let mut bytes = &self.data[at..at + 4];
            let chunk_index = bytes.read_u32::<LittleEndian>()?;
            let mut bytes = &self.data[at + 4..at + 6];
            let inner_index = bytes.read_u16::<LittleEndian>()?;
            let index = DictEntryPointer {
                chunk_index,
                inner_index,
            };
            pointers.push(index);
            at += 6;
        }

        Ok(pointers)
    }

    pub fn try_new(data: &'a [u8]) -> Result<Self> {
        let len = (&data[0..8]).read_u64::<LittleEndian>()? as usize;
        Ok(Self {
            data: &data[8..],
            len,
        })
    }

    pub fn create_bytes(pointer_vecs: &[Vec<DictEntryPointer>]) -> Result<Vec<u8>> {
        let capacity =
            pointer_vecs.iter().map(|v| v.len() * 6).sum::<usize>() + pointer_vecs.len() * 4 + 12;
        let mut data: Vec<u8> = Vec::with_capacity(capacity);

        // len of parent vector
        data.write_u64::<LittleEndian>(pointer_vecs.len() as u64)?;

        // parent vector items (pointers to child vectors)
        let mut vec_start: u32 = 0;
        for pointer_vec in pointer_vecs {
            data.write_u32::<LittleEndian>(vec_start)?;
            vec_start += pointer_vec.len() as u32 * 3;
        }
        // end double-byte index of child vectors
        data.write_u32::<LittleEndian>(vec_start)?;

        for pointer_vec in pointer_vecs {
            for pointer in pointer_vec {
                data.write_u32::<LittleEndian>(pointer.chunk_index)?;
                data.write_u16::<LittleEndian>(pointer.inner_index)?;
            }
        }

        Ok(data)
    }

    fn vec_pointer_position(&self, index: usize) -> Result<(usize, usize)> {
        let mut bytes = &self.data[index * 4..index * 4 + 4];
        let start = bytes.read_u32::<LittleEndian>()? as usize * 2;
        let mut bytes = &self.data[index * 4 + 4..index * 4 + 8];
        let end = bytes.read_u32::<LittleEndian>()? as usize * 2;

        let base = self.pointer_start();
        Ok((base + start, base + end))
    }

    fn pointer_start(&self) -> usize {
        self.len * 4 + 4
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
        let term_pointers = DictIndexPointers::try_new(&bytes[at..at + len])?;
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
