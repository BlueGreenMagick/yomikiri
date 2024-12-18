use std::io::{BufRead, Write};

use bincode::Options;
use ouroboros::self_referencing;
use serde::{Deserialize, Serialize};
use yomikiri_jmdict::{JMDictParser, JMneDictParser};

use crate::entry::{Entry, NameEntry};
use crate::index::{
    create_sorted_term_indexes, DictIndexMap, EntryIdx, NameEntryIdx, WordEntryIdx,
};
use crate::jagged_array::JaggedArray;
use crate::jmnedict::{parse_jmnedict_entry, NameEntriesBuilder};
use crate::meaning::{MeaningIdx, MeaningIndexBuilder};
use crate::{Result, WordEntry};

#[cfg(feature = "wasm")]
use tsify_next::Tsify;

#[self_referencing]
pub struct Dictionary<D: AsRef<[u8]> + 'static> {
    source: Box<D>,
    #[borrows(source)]
    #[covariant]
    pub view: DictionaryView<'this>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "wasm", derive(Tsify))]
#[cfg_attr(feature = "wasm", tsify(into_wasm_abi))]
pub struct DictionaryMetadata {
    jmdict_creation_date: Option<String>,
    jmnedict_creation_date: Option<String>,
}

pub struct DictionaryView<'a> {
    pub term_index: DictIndexMap<'a, EntryIdx>,
    pub meaning_index: DictIndexMap<'a, MeaningIdx>,
    pub entries: JaggedArray<'a, WordEntry>,
    pub name_entries: JaggedArray<'a, NameEntry>,
    pub metadata: DictionaryMetadata,
}

impl<D: AsRef<[u8]> + 'static> Dictionary<D> {
    pub fn try_decode(source: D) -> Result<Self> {
        let builder = DictionaryTryBuilder {
            source: Box::new(source),
            view_builder: |source| {
                DictionaryView::try_decode(source.as_ref().as_ref()).map(|(inner, _len)| inner)
            },
        };
        builder.try_build()
    }
}

impl<'a> DictionaryView<'a> {
    pub fn try_decode(source: &'a [u8]) -> Result<(Self, usize)> {
        let mut at = 0;
        let (term_index, len) = DictIndexMap::<EntryIdx>::try_decode(&source[at..])?;
        at += len;
        let (meaning_index, len) = DictIndexMap::<MeaningIdx>::try_decode(&source[at..])?;
        at += len;
        let (entries, len) = JaggedArray::try_decode(&source[at..])?;
        at += len;
        let (name_entries, len) = JaggedArray::try_decode(&source[at..])?;
        at += len;
        let metadata = bincode::options().deserialize_from(&source[at..])?;
        let s = Self {
            name_entries,
            term_index,
            meaning_index,
            entries,
            metadata,
        };
        Ok((s, at))
    }

    pub fn get_entries(&self, pointers: &[EntryIdx]) -> Result<Vec<Entry>> {
        pointers
            .iter()
            .map(|p| self.get_entry(p))
            .collect::<Result<Vec<Entry>>>()
    }

    pub fn get_entry(&self, pointer: &EntryIdx) -> Result<Entry> {
        match pointer {
            EntryIdx::Word(idx) => self.get_word_entry(idx).map(Entry::Word),
            EntryIdx::Name(idx) => self.get_name_entry(idx).map(Entry::Name),
        }
    }

    pub fn get_word_entry(&self, idx: &WordEntryIdx) -> Result<WordEntry> {
        self.entries.get(idx.0 as usize)
    }

    pub fn get_name_entry(&self, idx: &NameEntryIdx) -> Result<NameEntry> {
        self.name_entries.get(idx.0 as usize)
    }
}

pub struct DictionaryWriterJMDict {
    meaning_index_builder: MeaningIndexBuilder,
}
pub struct DictionaryWriterJMneDict {
    entries: Vec<WordEntry>,
    jmdict_creation_date: Option<String>,
    meaning_index_builder: MeaningIndexBuilder,
}

pub struct DictionaryWriterFinal {
    entries: Vec<WordEntry>,
    jmdict_creation_date: Option<String>,
    name_entries: Vec<NameEntry>,
    jmnedict_creation_date: Option<String>,
    meaning_index_builder: MeaningIndexBuilder,
}

/// ## Dictionary Format:
/// 1. DictIndexMap<TermIdx>
/// 2. DictIndexMap<MeaningIdx>
/// 3. JaggedArray<WordEntry>
/// 4. JaggedArray<NameEntry>
/// 5. DictionaryMetadata
#[derive(Default)]
pub struct DictionaryWriter<STATE> {
    state: STATE,
}

impl DictionaryWriter<DictionaryWriterJMDict> {
    pub fn new() -> Self {
        Self {
            state: DictionaryWriterJMDict {
                meaning_index_builder: MeaningIndexBuilder::with_capacity(200000),
            },
        }
    }

    pub fn read_jmdict<R: BufRead>(
        mut self,
        jmdict: R,
    ) -> Result<DictionaryWriter<DictionaryWriterJMneDict>> {
        let mut parser = JMDictParser::new(jmdict)?;
        // 203736 entries (2022-08-23)
        let mut entries = Vec::with_capacity(210000);
        while let Some(entry) = parser.next_entry()? {
            if entry.id < 5000000 || entry.id >= 6000000 {
                let entry = WordEntry::try_from(entry)?;
                self.state.meaning_index_builder.add_word_entry(&entry);
                entries.push(entry);
            }
        }
        Ok(DictionaryWriter {
            state: DictionaryWriterJMneDict {
                entries,
                meaning_index_builder: self.state.meaning_index_builder,
                jmdict_creation_date: parser.creation_date().map(|d| d.to_string()),
            },
        })
    }
}

impl DictionaryWriter<DictionaryWriterJMneDict> {
    pub fn read_jmnedict<R: BufRead>(
        mut self,
        jmnedict: R,
    ) -> Result<DictionaryWriter<DictionaryWriterFinal>> {
        let mut name_builder = NameEntriesBuilder::new();

        let mut parser = JMneDictParser::new(jmnedict)?;
        while let Some(entry) = parser.next_entry()? {
            parse_jmnedict_entry(&mut self.state.entries, &mut name_builder, entry)?;
        }

        let name_entries = name_builder.into_iter().collect::<Vec<NameEntry>>();

        Ok(DictionaryWriter {
            state: DictionaryWriterFinal {
                entries: self.state.entries,
                jmdict_creation_date: self.state.jmdict_creation_date,
                name_entries,
                jmnedict_creation_date: parser.creation_date().map(|d| d.to_string()),
                meaning_index_builder: self.state.meaning_index_builder,
            },
        })
    }
}

impl DictionaryWriter<DictionaryWriterFinal> {
    pub fn write<W: Write>(self, writer: &mut W) -> Result<()> {
        let metadata = DictionaryMetadata {
            jmdict_creation_date: self.state.jmdict_creation_date,
            jmnedict_creation_date: self.state.jmnedict_creation_date,
        };

        let term_index_items =
            create_sorted_term_indexes(&self.state.name_entries, &self.state.entries)?;
        DictIndexMap::build_and_encode_to(&term_index_items, writer)?;
        self.state.meaning_index_builder.write_into(writer)?;
        JaggedArray::build_and_encode_to(&self.state.entries, writer)?;
        JaggedArray::build_and_encode_to(&self.state.name_entries, writer)?;
        bincode::options().serialize_into(writer, &metadata)?;
        Ok(())
    }
}
