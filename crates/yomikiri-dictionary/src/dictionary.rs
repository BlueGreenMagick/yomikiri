use std::io::Write;

use ouroboros::self_referencing;

use crate::index::{create_sorted_term_indexes, DictIndexMap};
use crate::jagged_array::JaggedArray;
use crate::{Entry, Result};

#[self_referencing]
pub struct Dictionary<D: AsRef<[u8]> + 'static> {
    source: Box<D>,
    #[borrows(source)]
    #[covariant]
    view: DictionaryView<'this>,
}

pub struct DictionaryView<'a> {
    pub term_index: DictIndexMap<'a>,
    pub entries: JaggedArray<'a, Entry>,
}

impl<D: AsRef<[u8]> + 'static> Dictionary<D> {
    pub fn try_decode(source: D) -> Result<Self> {
        let builder = DictionaryTryBuilder {
            source: Box::new(source),
            view_builder: |source| {
                DictionaryView::try_decode(source.as_ref()).map(|(inner, _len)| inner)
            },
        };
        builder.try_build()
    }

    pub fn build_and_encode_to<W: Write>(entries: &[Entry], writer: &mut W) -> Result<()> {
        DictionaryView::build_and_encode_to(entries, writer)
    }
}

impl<'a> DictionaryView<'a> {
    pub fn try_decode(source: &'a [u8]) -> Result<(Self, usize)> {
        let mut at = 0;
        let (term_index, len) = DictIndexMap::try_decode(&source[at..])?;
        at += len;
        let (entries, _len) = JaggedArray::try_decode(&source[at..])?;
        at += len;
        let s = Self {
            term_index,
            entries,
        };
        Ok((s, at))
    }

    pub fn build_and_encode_to<W: Write>(entries: &[Entry], writer: &mut W) -> Result<()> {
        let term_index_items = create_sorted_term_indexes(entries)?;
        DictIndexMap::build_and_encode_to(&term_index_items, writer)?;
        JaggedArray::build_and_encode_to(entries, writer)?;
        Ok(())
    }
}
