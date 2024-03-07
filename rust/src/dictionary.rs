use crate::error::{YResult, YomikiriError};
use bincode::Options;
use std::fs::File;
use std::io::{BufReader, Cursor, Read, Seek};
use yomikiri_dictionary::entry::Entry;
use yomikiri_dictionary::file::{read_entries_with_buffers, DictTermIndex, BUFFER_SIZE};

pub struct Dictionary<R: Seek + Read> {
    index: Vec<DictTermIndex>,
    entries_reader: R,
    extraction_buffer: Vec<u8>,
    chunk_buffer: Vec<u8>,
}

impl<R: Seek + Read> Dictionary<R> {
    pub fn new(index: Vec<DictTermIndex>, entries_reader: R) -> Dictionary<R> {
        Dictionary {
            index,
            entries_reader,
            extraction_buffer: vec![0; BUFFER_SIZE],
            chunk_buffer: vec![0; BUFFER_SIZE],
        }
    }

    pub fn search(&mut self, term: &str) -> YResult<Vec<Entry>> {
        if let Ok(idx) = self.index.binary_search_by_key(&term, |item| &item.term) {
            let item = &self.index[idx];
            let entries = read_entries_with_buffers(
                &mut self.chunk_buffer,
                &mut self.extraction_buffer,
                &mut self.entries_reader,
                &item.entry_indexes,
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
        let next_idx = match self.index.binary_search_by_key(&prefix, |item| &item.term) {
            Ok(idx) => idx + 1,
            Err(idx) => idx,
        };
        if next_idx == self.index.len() {
            false
        } else {
            self.index[next_idx].term.starts_with(prefix)
        }
    }

    pub fn contains(&self, term: &str) -> bool {
        self.index
            .binary_search_by_key(&term, |item| &item.term)
            .is_ok()
    }

    /// Returns json text of entries
    pub fn search_json(&mut self, term: &str) -> YResult<Vec<String>> {
        if let Ok(idx) = self.index.binary_search_by_key(&term, |item| &item.term) {
            let item = &self.index[idx];
            let entries = read_entries_with_buffers(
                &mut self.chunk_buffer,
                &mut self.extraction_buffer,
                &mut self.entries_reader,
                &item.entry_indexes,
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

impl Dictionary<File> {
    pub fn from_paths(index_path: &str, entries_path: &str) -> YResult<Dictionary<File>> {
        let index_file = File::open(index_path)?;
        let reader = BufReader::new(index_file);
        let options = bincode::DefaultOptions::new();
        let index: Vec<DictTermIndex> = options.deserialize_from(reader).map_err(|e| {
            YomikiriError::InvalidDictionaryFile(format!(
                "Failed to parse dictionary index file. {}",
                e
            ))
        })?;
        let entries_file = File::open(entries_path)?;
        Ok(Dictionary::new(index, entries_file))
    }
}

impl Dictionary<Cursor<&[u8]>> {
    // UInt8Array are copied in when passed from js
    pub fn try_new(
        index_bytes: &[u8],
        entries_bytes: Vec<u8>,
    ) -> YResult<Dictionary<Cursor<Vec<u8>>>> {
        let options = bincode::DefaultOptions::new();
        let index: Vec<DictTermIndex> = options.deserialize_from(index_bytes).map_err(|e| {
            YomikiriError::InvalidDictionaryFile(format!(
                "Failed to parse dictionary index file. {}",
                e.to_string()
            ))
        })?;
        let cursor = Cursor::new(entries_bytes);
        Ok(Dictionary::new(index, cursor))
    }
}
