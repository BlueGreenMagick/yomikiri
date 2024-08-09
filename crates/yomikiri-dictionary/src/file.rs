use std::collections::HashMap;
use std::io::{Read, Seek, SeekFrom, Write};

use byteorder::{ByteOrder, LittleEndian, ReadBytesExt, WriteBytesExt};
use flate2::write::{GzDecoder, GzEncoder};
use flate2::Compression;
use fst::MapBuilder;
use serde::{Deserialize, Serialize};

use crate::entry::Entry;
use crate::error::Result;
use crate::index::DictIndexPointerArray;

/// Separate chunk when it gets bigger than this size
pub const CHUNK_CUTOFF_SIZE: usize = 16 * 1024;
/// Recommended minimum buffer size
pub const BUFFER_SIZE: usize = CHUNK_CUTOFF_SIZE + 8 * 1024;

pub const DICT_INDEX_FILENAME: &'static str = "english.yomikiriindex";
pub const DICT_ENTRIES_FILENAME: &'static str = "english.yomikiridict";
pub const DICT_METADATA_FILENAME: &'static str = "dictionary-metadata.json";

/// Location of a single jmdict entry in .yomikiridict
#[derive(PartialEq, Eq, PartialOrd, Ord, Debug, Serialize, Deserialize, Hash)]
pub struct DictEntryPointer {
    /// chunk starting byte index
    pub chunk_index: u32,
    /// entry starting byte index in uncompressed chunk
    pub inner_index: u16,
}

impl DictEntryPointer {
    pub fn new(chunk_index: u32, inner_index: u16) -> Self {
        DictEntryPointer {
            chunk_index,
            inner_index,
        }
    }
}

/// Locations of multiple jmdict entries for a single term in .yomikiridict
#[derive(Debug, Serialize, Deserialize)]
pub struct DictTermIndex {
    pub term: String,
    /// Sorted
    pub entry_indexes: Vec<DictEntryPointer>,
}

impl DictTermIndex {
    pub fn new<S: Into<String>>(term: S, entry_indexes: Vec<DictEntryPointer>) -> Self {
        DictTermIndex {
            term: term.into(),
            entry_indexes,
        }
    }
}

pub fn write_yomikiri_dictionary<I: Write + Seek, D: Write + Seek>(
    index_writer: &mut I,
    dict_writer: &mut D,
    entries: &[Entry],
) -> Result<()> {
    let term_indexes = write_entries(dict_writer, entries)?;
    write_indexes(index_writer, &term_indexes)?;

    Ok(())
}

pub fn parse_jmdict_xml(xml: &str) -> Result<Vec<Entry>> {
    let jm_entries = yomikiri_jmdict::parse_jmdict_xml(xml)?;
    let entries = jm_entries.into_iter().map(Entry::from).collect();
    Ok(entries)
}

/// entry_indexes should be sorted for better performance
pub fn read_entries<R: Read + Seek>(
    reader: &mut R,
    entry_pointers: &[DictEntryPointer],
) -> Result<Vec<Entry>> {
    let mut chunk_buffer: Vec<u8> = vec![0; BUFFER_SIZE];
    let mut extraction_buffer: Vec<u8> = Vec::with_capacity(BUFFER_SIZE);
    read_entries_with_buffers(
        &mut chunk_buffer,
        &mut extraction_buffer,
        reader,
        entry_pointers,
    )
}

/// - entry_pointers should be sorted for better performance
/// - buffer size must be bigger than `CHUNK_CUTOFF_SIZE + ENTRY_BUFFER_SIZE``
pub fn read_entries_with_buffers<R: Read + Seek>(
    chunk_buffer: &mut Vec<u8>,
    extraction_buffer: &mut Vec<u8>,
    reader: &mut R,
    entry_pointers: &[DictEntryPointer],
) -> Result<Vec<Entry>> {
    let mut entries: Vec<Entry> = Vec::with_capacity(3 * entry_pointers.len());
    let mut prev_chunk_index: u32 = u32::MAX;
    let mut chunk_size: usize = 0;

    for index in entry_pointers {
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
    let mut outer_indexes: HashMap<&str, Vec<DictEntryPointer>> = HashMap::with_capacity(64);
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
                .map(|&inner| DictEntryPointer::new(outer_pos, inner));
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

/// terms must be in lexicographic order.
pub fn write_indexes<W: Write>(writer: &mut W, terms: &[DictTermIndex]) -> Result<()> {
    let mut fst_bytes: Vec<u8> = Vec::with_capacity(1024 * 1024);
    let mut builder = MapBuilder::new(&mut fst_bytes)?;
    let mut pointers: Vec<Vec<DictEntryPointer>> = vec![];

    for term in terms {
        if term.entry_indexes.len() == 1 {
            let index = &term.entry_indexes[0];
            let value: u64 = (index.chunk_index as u64) << 16 | index.inner_index as u64;
            builder.insert(&term.term, value)?;
        } else {
            let mut term_ids: Vec<DictEntryPointer> = vec![];
            for index in &term.entry_indexes {
                let entry_pointer = DictEntryPointer {
                    chunk_index: index.chunk_index,
                    inner_index: index.inner_index,
                };
                term_ids.push(entry_pointer);
            }
            builder.insert(
                &term.term,
                1_u64 << 63 | (pointers.len() as u64 & ((1_u64 << 32) - 1)),
            )?;
            pointers.push(term_ids);
        }
    }
    builder.finish()?;

    writer.write_u32::<LittleEndian>(fst_bytes.len() as u32)?;
    writer.write(&fst_bytes)?;

    let pointers_bytes = DictIndexPointerArray::create_bytes(&pointers)?;

    writer.write_u32::<LittleEndian>(pointers_bytes.len() as u32)?;
    writer.write(&pointers_bytes)?;
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
