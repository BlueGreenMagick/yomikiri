use crate::error::{YResult, YomikiriError};
use fst::{IntoStreamer, Streamer};
use std::fs::{self, File};
use std::io::{Read, Seek};
use yomikiri_dictionary::entry::Entry;
use yomikiri_dictionary::file::{read_entries_with_buffers, BUFFER_SIZE};
use yomikiri_dictionary::index::DictIndex;

pub struct Dictionary<D: AsRef<[u8]> + 'static, R: Seek + Read> {
    index: DictIndex<D>,
    entries_reader: R,
    extraction_buffer: Vec<u8>,
    chunk_buffer: Vec<u8>,
}

impl<D: AsRef<[u8]>, R: Seek + Read> Dictionary<D, R> {
    pub fn new(index: DictIndex<D>, entries_reader: R) -> Dictionary<D, R> {
        Dictionary {
            index,
            entries_reader,
            extraction_buffer: vec![0; BUFFER_SIZE],
            chunk_buffer: vec![0; BUFFER_SIZE],
        }
    }

    pub fn search(&mut self, term: &str) -> YResult<Vec<Entry>> {
        let terms = &self.index.borrow_view().terms;
        if let Some(value) = terms.map.get(term) {
            let entry_indexes = terms.parse_value(value)?;
            let entries = read_entries_with_buffers(
                &mut self.chunk_buffer,
                &mut self.extraction_buffer,
                &mut self.entries_reader,
                &entry_indexes,
            )
            .map_err(|e| {
                YomikiriError::InvalidDictionaryFile(format!(
                    "Failed to parse dictionary entry JSON. {}",
                    e
                ))
            })?;
            Ok(entries)
        } else {
            Ok(Vec::new())
        }
    }

    /// Returns true only if there is a dictionary term
    /// that starts with `prefix` and is not `prefix`
    pub fn has_starts_with_excluding(&mut self, prefix: &str) -> bool {
        // assumes there is at least 1 entry.
        // needed in order to create a bytestring that is 1 greater than prefix below
        if prefix.len() == 0 {
            return true;
        }

        let mut next_prefix_bytes = prefix.as_bytes().to_vec();
        let len = next_prefix_bytes.len();
        next_prefix_bytes[len - 1] += 1;

        let terms = &self.index.borrow_view().terms;
        if let Some(_) = terms
            .map
            .range()
            .gt(prefix)
            .lt(&next_prefix_bytes)
            .into_stream()
            .next()
        {
            true
        } else {
            false
        }
    }

    pub fn contains(&self, term: &str) -> bool {
        self.index.borrow_view().terms.map.contains_key(term)
    }

    /// Returns json text of entries
    pub fn search_json(&mut self, term: &str) -> YResult<Vec<String>> {
        let terms = &self.index.borrow_view().terms;
        if let Some(value) = terms.map.get(term) {
            let entry_indexes = terms.parse_value(value)?;
            let entries = read_entries_with_buffers(
                &mut self.chunk_buffer,
                &mut self.extraction_buffer,
                &mut self.entries_reader,
                &entry_indexes,
            )
            .map_err(|e| {
                YomikiriError::InvalidDictionaryFile(format!(
                    "Failed to parse dictionary entry JSON. {}",
                    e
                ))
            })?;
            let jsons = entries
                .iter()
                .map(serde_json::to_string)
                .collect::<serde_json::Result<Vec<String>>>()
                .map_err(|e| {
                    YomikiriError::InvalidDictionaryFile(format!(
                        "Failed to parse dictionary entry JSON. {}",
                        e
                    ))
                })?;
            Ok(jsons)
        } else {
            Ok(Vec::new())
        }
    }
}

// TODO: switch to Memmap
impl Dictionary<Vec<u8>, File> {
    pub fn from_paths(index_path: &str, entries_path: &str) -> YResult<Dictionary<Vec<u8>, File>> {
        let index_bytes = fs::read(index_path)?;
        let index = DictIndex::try_from_source(index_bytes)?;
        let entries_file = File::open(entries_path)?;
        Ok(Dictionary::new(index, entries_file))
    }
}
