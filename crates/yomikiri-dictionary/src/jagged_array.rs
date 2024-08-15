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
    - len (8)
    repeated 'len' times
      - byte-position of items, divided by 2, where first item is 0. (4)
    - byte length of array of items (4)
  2. contiguous item bytes
    repeated 'len' times:
      bytes of items (n)
*/
#[derive(Serialize, Deserialize)]
pub struct JaggedArray<'a, T>
where
    T: Deserialize<'a> + Serialize,
{
    len: usize,
    data: &'a [u8],
    _typ: PhantomData<T>,
}

impl<'a, T> JaggedArray<'a, T>
where
    T: Deserialize<'a> + Serialize,
{
    pub fn try_new(data: &'a [u8]) -> Result<Self> {
        let len = (&data[0..8]).read_u64::<LittleEndian>()? as usize;
        Ok(Self {
            data,
            len,
            _typ: PhantomData,
        })
    }

    pub fn len(&self) -> usize {
        self.len
    }

    /// Get object at index
    pub fn get(&'a self, index: usize) -> Result<T> {
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
        buffer.try_reserve_exact(item_bytes.len() - buffer.capacity())?;
        buffer.write_all(&item_bytes)?;

        Ok(Self {
            len: items.len(),
            data: buffer,
            _typ: PhantomData,
        })
    }

    pub fn write_to<W: Write>(&self, writer: &mut W) -> Result<()> {
        writer.write_u64::<LittleEndian>(self.len() as u64)?;
        writer.write(self.data)?;
        Ok(())
    }
}
