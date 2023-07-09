#![allow(non_snake_case)]

use crate::error::{YResult, YomikiriError};
use crate::SharedBackend;
use lindera_core::mode::Mode;
use lindera_dictionary::{DictionaryConfig, DictionaryKind};
use lindera_tokenizer::tokenizer::{Tokenizer, TokenizerConfig};
#[cfg(wasm)]
use serde::Serialize;
use std::io::{Read, Seek};
use unicode_normalization::UnicodeNormalization;
use unicode_segmentation::UnicodeSegmentation;

#[cfg_attr(wasm, derive(Serialize))]
#[cfg_attr(uniffi, derive(uniffi::Record))]
pub struct Token {
    pub text: String,
    /// defaults to `UNK`
    pub partOfSpeech: String,
    /// defaults to `text`
    pub baseForm: String,
    /// defaults to `*`
    pub reading: String,
    /// defaults to `*`
    pub pos2: String,
    /// start idx
    pub start: i32,
}

fn get_value_from_detail<S: Into<String>>(
    details: &Option<Vec<&str>>,
    index: usize,
    default: S,
) -> String {
    details
        .as_deref()
        .map(|d| d.get(index).map(|s| s.to_string()))
        .flatten()
        .unwrap_or_else(|| default.into())
}

impl<R: Read + Seek> SharedBackend<R> {
    pub fn tokenize_inner<'a>(&self, sentence: &'a str) -> YResult<Vec<Token>> {
        let normalized_sentence = sentence.nfc().collect::<String>();
        let already_normalized: bool = sentence == normalized_sentence;

        let mut ltokens = self.tokenizer.tokenize(&normalized_sentence)?;
        let mut tokens = Vec::with_capacity(ltokens.capacity());

        // iterator of starting indices of each graphemes
        let original_graphemes = sentence.grapheme_indices(true);
        let normalized_graphemes = normalized_sentence.grapheme_indices(true);
        let mut graphemes = original_graphemes.zip(normalized_graphemes);

        let mut orig_char_indices = sentence.char_indices().enumerate();

        for tok in &mut ltokens {
            let byte_start = if already_normalized {
                tok.byte_start
            } else {
                graphemes
                    .find_map(|((original_idx, _), (normalized_idx, _))| {
                        if normalized_idx == tok.byte_start {
                            Some(original_idx)
                        } else {
                            None
                        }
                    })
                    .ok_or(YomikiriError::BytePositionError)?
            };
            let char_start = orig_char_indices
                .find_map(|(i, (a, _))| if a == byte_start { Some(i) } else { None })
                .ok_or(YomikiriError::BytePositionError)?;

            let text = tok.text.to_string();
            let details = tok.get_details();

            let token = Token {
                baseForm: get_value_from_detail(&details, 10, &text),
                reading: get_value_from_detail(&details, 9, "*"),
                partOfSpeech: get_value_from_detail(&details, 0, "UNK"),
                pos2: get_value_from_detail(&details, 1, "*"),
                text: text,
                start: char_start as i32,
            };
            tokens.push(token)
        }

        Ok(tokens)
    }
}

pub fn createTokenizer() -> Tokenizer {
    let dictionary = DictionaryConfig {
        kind: Some(DictionaryKind::UniDic),
        path: None,
    };
    let config = TokenizerConfig {
        dictionary,
        user_dictionary: None,
        mode: Mode::Normal,
    };
    Tokenizer::from_config(config).unwrap()
}
