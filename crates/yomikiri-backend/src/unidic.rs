use lindera_core::{
    character_definition::CharacterDefinitions, connection::ConnectionCostMatrix,
    dictionary::Dictionary, prefix_dict::PrefixDict, unknown_dictionary::UnknownDictionary,
    LinderaResult,
};
use std::borrow::Cow;

macro_rules! const_data {
    ($name: ident, $filename: literal) => {
        const $name: &'static [u8] = include_bytes!(concat!("../../unidic/output/", $filename));
    };
}

const_data!(CHAR_DEFINITION_DATA, "char_def.bin");
const_data!(CONNECTION_DATA, "matrix.mtx");
const_data!(UNIDIC_DATA, "dict.da");
const_data!(UNIDIC_VALS, "dict.vals");
const_data!(UNKNOWN_DATA, "unk.bin");
const_data!(WORDS_IDX_DATA, "dict.wordsidx");
const_data!(WORDS_DATA, "dict.words");

pub fn load_dictionary() -> LinderaResult<Dictionary> {
    Ok(Dictionary {
        dict: prefix_dict(),
        cost_matrix: connection(),
        char_definitions: char_def()?,
        unknown_dictionary: unknown_dict()?,
        words_idx_data: words_idx_data(),
        words_data: words_data(),
    })
}

pub fn char_def() -> LinderaResult<CharacterDefinitions> {
    #[allow(clippy::needless_borrow)]
    CharacterDefinitions::load(&CHAR_DEFINITION_DATA)
}

pub fn connection() -> ConnectionCostMatrix {
    ConnectionCostMatrix::load_static(CONNECTION_DATA)
}

pub fn prefix_dict() -> PrefixDict {
    #[allow(clippy::needless_borrow)]
    PrefixDict::from_static_slice(&UNIDIC_DATA, &UNIDIC_VALS)
}

pub fn unknown_dict() -> LinderaResult<UnknownDictionary> {
    #[allow(clippy::needless_borrow)]
    UnknownDictionary::load(&UNKNOWN_DATA)
}

pub fn words_idx_data() -> Cow<'static, [u8]> {
    Cow::Borrowed(WORDS_IDX_DATA)
}

pub fn words_data() -> Cow<'static, [u8]> {
    Cow::Borrowed(WORDS_DATA)
}
