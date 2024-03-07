use std::collections::HashMap;
use std::io::{Read, Seek, SeekFrom, Write};

use byteorder::{ByteOrder, LittleEndian, ReadBytesExt, WriteBytesExt};
use flate2::write::{GzDecoder, GzEncoder};
use flate2::Compression;
use serde::{Deserialize, Serialize};

use crate::entry::Entry;
use crate::error::Result;

/// Separate chunk when it gets bigger than this size
pub const CHUNK_CUTOFF_SIZE: usize = 16 * 1024;
/// Recommended minimum buffer size
pub const BUFFER_SIZE: usize = CHUNK_CUTOFF_SIZE + 8 * 1024;

#[derive(PartialEq, Eq, PartialOrd, Ord, Debug, Serialize, Deserialize, Hash)]
pub struct DictEntryIndex {
    /// chunk starting byte index
    pub chunk_index: u32,
    /// entry starting byte index in uncompressed chunk
    pub inner_index: u16,
}

impl DictEntryIndex {
    pub fn new(chunk_index: u32, inner_index: u16) -> Self {
        DictEntryIndex {
            chunk_index,
            inner_index,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DictTermIndex {
    pub term: String,
    /// Sorted
    pub entry_indexes: Vec<DictEntryIndex>,
}

impl DictTermIndex {
    pub fn new<S: Into<String>>(term: S, entry_indexes: Vec<DictEntryIndex>) -> Self {
        DictTermIndex {
            term: term.into(),
            entry_indexes,
        }
    }
}

/// entry_indexes should be sorted for better performance
pub fn read_entries<R: Read + Seek>(
    reader: &mut R,
    entry_indexes: &[DictEntryIndex],
) -> Result<Vec<Entry>> {
    let mut chunk_buffer: Vec<u8> = vec![0; BUFFER_SIZE];
    let mut extraction_buffer: Vec<u8> = Vec::with_capacity(BUFFER_SIZE);
    read_entries_with_buffers(
        &mut chunk_buffer,
        &mut extraction_buffer,
        reader,
        entry_indexes,
    )
}

/// - entry_indexes should be sorted for better performance
/// - buffer size must be bigger than `CHUNK_CUTOFF_SIZE + ENTRY_BUFFER_SIZE``
pub fn read_entries_with_buffers<R: Read + Seek>(
    chunk_buffer: &mut Vec<u8>,
    extraction_buffer: &mut Vec<u8>,
    reader: &mut R,
    entry_indexes: &[DictEntryIndex],
) -> Result<Vec<Entry>> {
    let mut entries: Vec<Entry> = Vec::with_capacity(3 * entry_indexes.len());
    let mut prev_chunk_index: u32 = u32::MAX;
    let mut chunk_size: usize = 0;

    for index in entry_indexes {
        // last chunk read is cached
        if index.chunk_index != prev_chunk_index || chunk_size == 0 {
            extraction_buffer.clear();
            reader.seek(SeekFrom::Start(index.chunk_index.into()))?;
            chunk_size = reader.read_u16::<LittleEndian>()?.into();
            if chunk_size > chunk_buffer.len() {
                chunk_buffer.resize(chunk_size, 0);
            }
            reader.read_exact(&mut chunk_buffer[0..chunk_size])?;
            ungzip_bytes_into(extraction_buffer, &chunk_buffer[0..chunk_size])?;
        }
        prev_chunk_index = index.chunk_index;
        let inner_idx: usize = index.inner_index.into();
        let entry_size = LittleEndian::read_u16(&extraction_buffer[inner_idx..]);
        let inner_idx = inner_idx + 2;
        let entry: Entry = serde_json::from_slice(
            &extraction_buffer[inner_idx..inner_idx + usize::from(entry_size)],
        )?;
        entries.push(entry);
    }
    Ok(entries)
}

/// Returns sorted Vec<DictTermIndex>
pub fn write_entries<W: Write>(writer: &mut W, entries: &[Entry]) -> Result<Vec<DictTermIndex>> {
    let mut chunk_buffer: Vec<u8> = Vec::with_capacity(BUFFER_SIZE);
    let mut outer_indexes: HashMap<&str, Vec<DictEntryIndex>> = HashMap::with_capacity(64);
    let mut inner_indexes: HashMap<&str, Vec<u16>> = HashMap::with_capacity(64);
    let mut outer_pos: u32 = 0;
    let mut inner_pos: u16 = 0;
    let mut entries_iter = entries.iter();
    let mut next_entry = entries_iter.next();

    while next_entry.is_some() {
        while chunk_buffer.len() < CHUNK_CUTOFF_SIZE && next_entry.is_some() {
            let entry = next_entry.unwrap();
            for term in entry.terms() {
                inner_indexes
                    .entry(term)
                    .and_modify(|index| index.push(inner_pos))
                    .or_insert_with(|| vec![inner_pos]);
            }

            let serialized = serde_json::to_vec(entry)?;
            let serialized_len: u16 = serialized.len().try_into()?;
            chunk_buffer.write_u16::<LittleEndian>(serialized_len)?;
            chunk_buffer.write_all(&serialized)?;
            inner_pos += 2 + serialized_len;
            next_entry = entries_iter.next();
        }

        for (term, inner_index) in inner_indexes.iter() {
            let iter = inner_index
                .iter()
                .map(|&inner| DictEntryIndex::new(outer_pos, inner));
            outer_indexes.entry(term).or_default().extend(iter);
        }

        let compressed = gzip_bytes(&chunk_buffer)?;
        let compressed_len: u16 = compressed.len().try_into()?;
        writer.write_u16::<LittleEndian>(compressed_len)?;
        writer.write_all(&compressed)?;
        outer_pos += 2 + u32::from(compressed_len);
        inner_pos = 0;
        inner_indexes.clear();
        chunk_buffer.clear();
    }

    let mut dict_indexes: Vec<DictTermIndex> = outer_indexes
        .into_iter()
        .map(|(term, mut index)| {
            index.sort();
            DictTermIndex::new(term, index)
        })
        .collect();
    dict_indexes.sort_by(|a, b| a.term.cmp(&b.term));
    Ok(dict_indexes)
}

fn gzip_bytes(bytes: &[u8]) -> Result<Vec<u8>> {
    let mut encoder = GzEncoder::new(Vec::new(), Compression::new(9));
    encoder.write_all(bytes)?;
    Ok(encoder.finish()?)
}

fn ungzip_bytes_into<W: Write>(writer: &mut W, bytes: &[u8]) -> Result<()> {
    let mut decoder = GzDecoder::new(writer);
    decoder.write_all(bytes)?;
    decoder.finish()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::io::Cursor;

    use crate::entry::{Entry, Form, Reading};

    use super::{read_entries, write_entries, Result};

    #[test]
    fn write_then_read_single_entry() -> Result<()> {
        let entry = Entry {
            forms: vec![
                Form {
                    form: "読み切り".into(),
                    info: vec![],
                    uncommon: false,
                },
                Form {
                    form: "読みきり".into(),
                    info: vec![],
                    uncommon: false,
                },
            ],
            readings: vec![Reading {
                reading: "よみきり".into(),
                nokanji: false,
                to_form: vec![],
                info: vec!["information".into()],
                uncommon: false,
            }],
            senses: vec![],
            priority: 10,
        };
        let mut buffer = Vec::new();
        let term_indexes = write_entries(&mut buffer, &[entry.clone()])?;
        assert_eq!(term_indexes.len(), entry.terms().len());

        let term_index = term_indexes.iter().find(|t| t.term == "読みきり").unwrap();
        let mut reader = Cursor::new(&buffer[..]);
        let entries = read_entries(&mut reader, &term_index.entry_indexes)?;
        assert_eq!(entries, vec![entry]);
        Ok(())
    }
}
