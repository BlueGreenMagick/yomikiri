use ouroboros::self_referencing;

use crate::index::DictIndexMap;
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
}

impl<'a> DictionaryView<'a> {
    pub fn try_decode(source: &'a [u8]) -> Result<(Self, usize)> {
        let mut at = 0;
        let (term_index, len) = DictIndexMap::try_decode(&source[at..])?;
        at += len;
        let (entries, _len) = JaggedArray::decode_from_bytes(&source[at..])?;
        at += len;
        let s = Self {
            term_index,
            entries,
        };
        Ok((s, at))
    }
}
