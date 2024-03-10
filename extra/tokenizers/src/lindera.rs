use std::borrow::Cow;

use anyhow::Result;
use lindera_core::mode::Mode;
use lindera_core::{
    character_definition::CharacterDefinitions, connection::ConnectionCostMatrix,
    dictionary::Dictionary, prefix_dict::PrefixDict, unknown_dictionary::UnknownDictionary,
};
use lindera_tokenizer::tokenizer::Tokenizer;
use yomikiri_unidic_types::UnidicPos;

use crate::types::Token;

pub struct Lindera {
    pub tokenizer: Tokenizer,
}

impl Lindera {
    pub fn load(
        unidic_data: Cow<'static, [u8]>,
        unidic_vals: Cow<'static, [u8]>,
        connection_data: Cow<'static, [u8]>,
        char_definitions: Cow<'static, [u8]>,
        unknown_data: Cow<'static, [u8]>,
        words_idx: Cow<'static, [u8]>,
        words_data: Cow<'static, [u8]>,
    ) -> Result<Self> {
        let dictionary = Dictionary {
            dict: PrefixDict::from_static_slice(&unidic_data, &unidic_vals),
            cost_matrix: match connection_data {
                Cow::Owned(owned) => ConnectionCostMatrix::load(&owned),
                Cow::Borrowed(borrowed) => ConnectionCostMatrix::load_static(&borrowed),
            },
            char_definitions: CharacterDefinitions::load(&char_definitions)?,
            unknown_dictionary: UnknownDictionary::load(&unknown_data)?,
            words_idx_data: words_idx,
            words_data: words_data,
        };
        let tokenizer = Tokenizer::new(dictionary, None, Mode::Normal);

        Ok(Self { tokenizer })
    }

    pub fn tokenize(&self, text: &str) -> Result<Vec<Token>> {
        let mut ltokens = self.tokenizer.tokenize(text)?;
        let tokens: Vec<Token> = ltokens
            .iter_mut()
            .map(|t| {
                let surface = t.text.to_string();
                let details = t.get_details().unwrap_or(vec![]);
                let (pos, pos2) = details
                    .get(0)
                    .and_then(|p| p.as_bytes().get(0))
                    .and_then(|short| UnidicPos::from_short(*short).ok())
                    .map(|pos| pos.to_unidic())
                    .unwrap_or(("UNK", "*"));
                let pos = pos.to_string();
                let pos2 = pos2.to_string();
                Token {
                    surface,
                    pos,
                    reading: details.get(2).unwrap_or(&"").to_string(),
                    others: vec![pos2],
                }
            })
            .collect();
        Ok(tokens)
    }
}
