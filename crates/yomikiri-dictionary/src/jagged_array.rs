use std::io::Write;
use std::marker::PhantomData;

use bincode::Options;
use byteorder::{LittleEndian, ReadBytesExt, WriteBytesExt};
use serde::{Deserialize, Serialize};

use crate::{Error, Result};

/// Vector of objects that reads from byte slice without copy
/// Serialized objects must not exceed 2^32 bytes.
///
/// The structure is made up of 2 parts.
/// Latter part is made up of objects serialized into bytes, laid out contiguously.
/// Initial part is an array of pointers to serialized objects.
///
/// This structure allows retrieving variable-sized objects in constant time with an index.
/*
  Structure (bytes):
  1. array of pointers
    repeated 'len' times
      - byte-position of items, divided by 2, where first item is 0. (4)
    - byte length of array of items (4)
  2. contiguous item bytes
    repeated 'len' times:
      bytes of items (n)

  We can retrieve the start and end byte position of an item in array, that we can use to deserialize object.
*/
#[derive(Serialize, Deserialize)]
pub struct JaggedArray<'a, T>
where
    T: Deserialize<'a> + Serialize,
{
    cnt: usize,
    data: &'a [u8],
    _typ: PhantomData<T>,
}

impl<'a, T> JaggedArray<'a, T>
where
    T: Deserialize<'a> + Serialize,
{
    pub fn len(&self) -> usize {
        self.cnt
    }

    pub fn is_empty(&self) -> bool {
        self.cnt == 0
    }

    /// Get object at index
    pub fn get(&'a self, index: usize) -> Result<T> {
        if index >= self.cnt {
            return Err(Error::OutOfRange);
        }

        let (item_start, item_end) = self.item_position(index)?;
        let item_bytes = &self.data[item_start..item_end];
        let item = bincode::options().deserialize(item_bytes)?;

        Ok(item)
    }

    /// return starting and ending byte index within `.data` of item at index
    /// index is assumed to be valid
    fn item_position(&self, index: usize) -> Result<(usize, usize)> {
        let at = index * 4;
        let mut bytes = &self.data[at..at + 4];
        let start = bytes.read_u32::<LittleEndian>()? as usize;
        let mut bytes = &self.data[at + 4..at + 8];
        let end = bytes.read_u32::<LittleEndian>()? as usize;
        let base = self.items_start();

        Ok((base + start, base + end))
    }

    fn items_start(&self) -> usize {
        self.cnt * 4 + 4
    }

    pub fn build_and_encode_to<W: Write>(items: &[T], writer: &mut W) -> Result<()> {
        let mut index_bytes: Vec<u8> = Vec::with_capacity(4 * items.len());
        let mut item_bytes: Vec<u8> = Vec::with_capacity(8 * items.len());
        for item in items {
            index_bytes.write_u32::<LittleEndian>(item_bytes.len().try_into()?)?;
            bincode::options().serialize_into(&mut item_bytes, item)?;
        }
        index_bytes.write_u32::<LittleEndian>(item_bytes.len().try_into()?)?;

        let bytes_len = 4 + index_bytes.len() + item_bytes.len();
        writer.write_u32::<LittleEndian>(bytes_len.try_into()?)?;
        writer.write_u32::<LittleEndian>(items.len().try_into()?)?;
        writer.write_all(&index_bytes)?;
        writer.write_all(&item_bytes)?;
        Ok(())
    }

    pub fn try_decode(source: &'a [u8]) -> Result<(Self, usize)> {
        let bytes_len = (&source[0..4]).read_u32::<LittleEndian>()? as usize;
        let cnt = (&source[4..8]).read_u32::<LittleEndian>()? as usize;
        let data = &source[8..4 + bytes_len];
        let arr = Self {
            data,
            cnt,
            _typ: PhantomData,
        };

        Ok((arr, bytes_len + 4))
    }

    pub fn all_items_iter(&'a self) -> impl Iterator<Item = Result<T>> + 'a {
        (0..self.cnt).map(move |i| self.get(i))
    }
}

#[cfg(test)]
mod tests {
    use super::JaggedArray;
    use super::Result;

    #[test]
    fn check_encode_then_decode_is_identical() -> Result<()> {
        let vec = vec![1, 4, -5];
        let mut bytes: Vec<u8> = Vec::with_capacity(128);
        JaggedArray::build_and_encode_to(&vec, &mut bytes)?;
        let (arr, _len) = JaggedArray::<i32>::try_decode(&bytes)?;
        assert_eq!(arr.len(), vec.len());
        assert_eq!(arr.get(0)?, vec[0]);
        assert_eq!(arr.get(1)?, vec[1]);
        assert_eq!(arr.get(2)?, vec[2]);

        Ok(())
    }
}
