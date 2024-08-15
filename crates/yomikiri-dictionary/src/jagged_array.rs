use std::io::Write;
use std::marker::PhantomData;

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
    pub fn decode_from_bytes(source: &'a [u8]) -> Result<(Self, usize)> {
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

    pub fn len(&self) -> usize {
        self.cnt
    }

    /// Get object at index
    pub fn get(&'a self, index: usize) -> Result<T> {
        if index >= self.cnt {
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
        self.cnt * 4 + 4
    }

    /// Create JaggedArray from Vec<T>
    pub fn from_vec_with_buffer(items: &[T], buffer: &'a mut Vec<u8>) -> Result<Self> {
        let mut item_bytes: Vec<u8> = Vec::with_capacity(8 * items.len());
        for item in items {
            buffer.write_u32::<LittleEndian>(item_bytes.len().try_into()?)?;
            bincode::serde::encode_into_std_write(
                item,
                &mut item_bytes,
                bincode::config::legacy(),
            )?;
        }
        buffer.write_u32::<LittleEndian>(item_bytes.len().try_into()?)?;

        if item_bytes.len() > buffer.capacity() {
            buffer.try_reserve_exact(item_bytes.len() - buffer.capacity())?;
        }
        buffer.write_all(&item_bytes)?;

        Ok(Self {
            cnt: items.len(),
            data: buffer,
            _typ: PhantomData,
        })
    }

    pub fn encode_to<W: Write>(&self, writer: &mut W) -> Result<()> {
        let bytes_len = 4 + self.data.len();
        let bytes_len: u32 = bytes_len.try_into()?;
        writer.write_u32::<LittleEndian>(bytes_len)?;
        writer.write_u32::<LittleEndian>(self.len().try_into()?)?;
        writer.write(self.data)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::JaggedArray;

    #[test]
    fn check_encode_then_decode_is_identical() {
        let vec = vec![1, 4, 6, 7, 8];
        let mut buffer: Vec<u8> = Vec::with_capacity(128);
        let arr = JaggedArray::from_vec_with_buffer(&vec, &mut buffer).unwrap();
        let mut bytes: Vec<u8> = Vec::with_capacity(128);
        arr.encode_to(&mut bytes).unwrap();
        let (arr2, _len) = JaggedArray::<i32>::decode_from_bytes(&bytes).unwrap();
        assert_eq!(arr.len(), arr2.len());
        assert_eq!(arr.data, arr2.data);
    }
}
