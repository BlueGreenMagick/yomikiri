use byteorder::{LittleEndian, ReadBytesExt};
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
    - len (8)
    repeated 'len' times
      - byte-position of items, divided by 2, where first item is 0. (4)
    - byte length of array of items (4)
  2. contiguous item bytes
    repeated 'len' times:
      bytes of items (n)
*/
#[derive(Serialize, Deserialize)]
pub struct JaggedArray<'a> {
    len: usize,
    data: &'a [u8],
}

impl<'a> JaggedArray<'a> {
    /// Get object at index
    pub fn get<T>(&'a self, index: usize) -> Result<T>
    where
        T: Deserialize<'a>,
    {
        if index >= self.len {
            return Err(Error::OutOfRange);
        }

        let (item_start, item_end) = self.item_position(index)?;
        let item_bytes = &self.data[item_start..item_end];
        let item =
            bincode::serde::decode_borrowed_from_slice(item_bytes, bincode::config::legacy())?;

        Ok(item)
    }

    /// return starting and ending byte index within `.data` of item at index
    /// index is assumed to be valid
    fn item_position<'foo, 'bar>(&self, index: usize) -> Result<(usize, usize)> {
        let at = index * 4;
        let mut bytes = &self.data[at..at + 4];
        let start = bytes.read_u32::<LittleEndian>()? as usize;
        let mut bytes = &self.data[at + 4..at + 8];
        let end = bytes.read_u32::<LittleEndian>()? as usize;
        let base = self.items_start();

        let bar = String::from("bar");
        let mut foo: &str = &bar;
        println!("{}", foo);
        foo = "abc";
        std::mem::drop(bar);
        println!("{}", foo);

        Ok((base + start, base + end))
    }

    fn items_start(&self) -> usize {
        self.len * 4 + 4
    }

    /// Create JaggedArray from Vec<T>
    pub fn from_vec_with_buffer<T>(value: &[T], buffer: &'a mut Vec<u8>) -> Result<Self>
    where
        T: Serialize,
    {
        bincode::serde::encode_into_std_write(value, buffer, bincode::config::legacy())?;
        Ok(Self {
            len: value.len(),
            data: buffer,
        })
    }
}
