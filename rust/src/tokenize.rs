#![allow(non_snake_case)]

use crate::error::{YResult, YomikiriError};
use crate::SharedBackend;
use lindera_core::mode::Mode;
use lindera_dictionary::{DictionaryConfig, DictionaryKind};
use lindera_tokenizer::tokenizer::{Tokenizer, TokenizerConfig};
use std::io::{Read, Seek};
use unicode_normalization::UnicodeNormalization;
use unicode_segmentation::UnicodeSegmentation;

#[cfg(wasm)]
use serde::Serialize;

#[cfg_attr(wasm, derive(Serialize))]
#[cfg_attr(uniffi, derive(uniffi::Record))]
#[derive(Debug, Clone)]
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
    pub start: u32,
}

#[cfg_attr(wasm, derive(Serialize))]
#[cfg_attr(uniffi, derive(uniffi::Record))]
pub struct RawTokenizeResult {
    pub tokens: Vec<Token>,
    pub selectedTokenIdx: u32,
    // entries in JSON
    pub dicEntriesJson: Vec<String>,
}

impl<R: Read + Seek> SharedBackend<R> {
    pub fn tokenize<'a>(
        &mut self,
        sentence: &'a str,
        char_idx: usize,
    ) -> YResult<RawTokenizeResult> {
        let mut tokens = self.tokenize_inner(sentence)?;
        self.manual_patches(&mut tokens);
        self.join_all_tokens(&mut tokens)?;
        let token_idx = match tokens.iter().position(|t| (t.start as usize) > char_idx) {
            Some(i) => i - 1,
            None => tokens.len() - 1,
        };
        let dict_jsons = self.dictionary.search_json(&tokens[token_idx].text)?;

        Ok(RawTokenizeResult {
            tokens,
            selectedTokenIdx: token_idx.try_into().map_err(|_| {
                YomikiriError::OtherError("Could not represent selectedTokenIdx as u32".into())
            })?,
            dicEntriesJson: dict_jsons,
        })
    }

    fn tokenize_inner<'a>(&self, sentence: &'a str) -> YResult<Vec<Token>> {
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
                start: char_start as u32,
            };
            tokens.push(token)
        }
        Ok(tokens)
    }

    /// Join tokens in-place if longer token exist in dictionary
    /// /// e.g. [込ん,で,いる] => 込んでいる
    fn join_all_tokens(&mut self, tokens: &mut Vec<Token>) -> YResult<()> {
        let mut i = 0;
        while i < tokens.len() {
            self.join_tokens_from(tokens, i)?;
            i += 1;
        }
        Ok(())
    }

    fn join_tokens_from(&mut self, tokens: &mut Vec<Token>, from: usize) -> YResult<()> {
        self.join_compounds_multi(tokens, from)?;
        self.join_prefix(tokens, from)?;
        self.join_pre_noun(tokens, from)?;
        self.join_conjunction(tokens, from)?;
        self.join_suffix(tokens, from)?;
        self.join_inflections(tokens, from)?;
        Ok(())
    }

    /// Join maximal expression tokens starting from tokens[index]
    ///
    /// Handles cases:
    ///     1. (any)+ => (expression)
    ///     2. (名詞)+ => (名詞)
    ///     3. (助詞)+ => (助詞) e.g.　「かも」、「では」
    fn join_compounds_multi(&mut self, tokens: &mut Vec<Token>, from: usize) -> YResult<bool> {
        let token = &tokens[from];
        let mut all_noun = token.partOfSpeech == "名詞";
        let mut all_particle = token.partOfSpeech == "助詞";

        let mut to = from + 1;
        let mut joined_text_prev = token.text.clone();

        let mut last_found_to = to;
        let mut last_found_is_base = true;
        let mut last_found_pos: &str = &token.partOfSpeech;

        while to < tokens.len() {
            let token = &tokens[to];
            all_noun = all_noun && token.partOfSpeech == "名詞";
            all_particle = all_particle && token.partOfSpeech == "助詞";

            let joined_text = concat_string(&joined_text_prev, &token.text);
            let found = self.dictionary.search(&joined_text)?.iter().any(|e| {
                e.is_expression() || (all_noun && e.is_noun()) || (all_particle && e.is_particle())
            });

            if found {
                last_found_to = to + 1;
                last_found_is_base = false;
                last_found_pos = if all_noun {
                    "名詞"
                } else if all_particle {
                    "助詞"
                } else {
                    "=exp="
                }
            } else {
                let joined_text_base = concat_string(&joined_text_prev, &token.baseForm);
                let found_base = self.dictionary.search(&joined_text_base)?.iter().any(|e| {
                    e.is_expression()
                        || (all_noun && e.is_noun())
                        || (all_particle && e.is_particle())
                });

                if found_base {
                    last_found_to = to + 1;
                    last_found_is_base = true;
                    last_found_pos = if all_noun {
                        "名詞"
                    } else if all_particle {
                        "助詞"
                    } else {
                        "=exp="
                    }
                }
            }
            let found_next = self.dictionary.has_starts_with_excluding(&joined_text);
            if !found_next {
                let pos = String::from(last_found_pos);
                join_tokens(tokens, from, last_found_to, pos, last_found_is_base);
                return Ok(last_found_to - from > 1);
            }
            joined_text_prev = joined_text;
            to += 1;
        }

        let pos = String::from(last_found_pos);
        join_tokens(tokens, from, to, pos, false);
        return Ok(to - from > 1);
    }

    /// (接頭詞) (any) => (any)
    fn join_prefix(&mut self, tokens: &mut Vec<Token>, from: usize) -> YResult<bool> {
        if from + 1 >= tokens.len() {
            return Ok(false);
        }
        let token = &tokens[from];
        if token.partOfSpeech != "接頭辞" {
            return Ok(false);
        }

        let next_token = &tokens[from + 1];
        let compound = concat_string(&token.text, &next_token.baseForm);
        let search = self.dictionary.search(&compound)?;
        if search.is_empty() {
            return Ok(false);
        }

        let pos = String::from(&next_token.partOfSpeech);
        join_tokens(tokens, from, from + 2, pos, true);
        return Ok(true);
    }

    /// (連体詞) (名詞 | 代名詞 | 接頭辞) => (any)
    fn join_pre_noun(&mut self, tokens: &mut Vec<Token>, from: usize) -> YResult<bool> {
        if from + 1 >= tokens.len() {
            return Ok(false);
        }
        let token = &tokens[from];
        if token.partOfSpeech != "連体詞" {
            return Ok(false);
        }
        let next_token = &tokens[from + 1];
        let next_pos = &next_token.partOfSpeech;
        if next_pos != "名詞" && next_pos != "代名詞" && next_pos != "接頭辞" {
            return Ok(false);
        }

        let compound = concat_string(&token.text, &next_token.baseForm);
        let search = self.dictionary.search(&compound)?;
        if search.is_empty() {
            return Ok(false);
        }

        let pos = String::from(next_pos);
        join_tokens(tokens, from, from + 2, pos, true);
        return Ok(true);
    }

    /// (any) (助詞) => conj
    ///
    /// Join any that ends with 助詞 because
    /// unidic is not good at determining if a given 助詞 is 接続助詞
    fn join_conjunction(&mut self, tokens: &mut Vec<Token>, from: usize) -> YResult<bool> {
        if from + 1 >= tokens.len() {
            return Ok(false);
        }
        let next_token = &tokens[from + 1];
        if next_token.partOfSpeech != "助詞" {
            return Ok(false);
        }

        let token = &tokens[from];
        let compound = concat_string(&token.text, &next_token.text);
        let search = self
            .dictionary
            .search(&compound)?
            .iter()
            .any(|e| e.is_conjunction());
        if !search {
            return Ok(false);
        }

        join_tokens(tokens, from, from + 2, "接続詞", false);
        return Ok(true);
    }

    fn join_suffix(&mut self, tokens: &mut Vec<Token>, from: usize) -> YResult<bool> {
        if from + 1 >= tokens.len() {
            return Ok(false);
        }
        let next_token = &tokens[from + 1];
        if next_token.partOfSpeech != "接尾辞" {
            return Ok(false);
        }

        let token = &tokens[from];
        let compound = concat_string(&token.text, &next_token.baseForm);
        let search = self.dictionary.search(&compound)?;
        if search.is_empty() {
            return Ok(false);
        }

        let new_pos = match next_token.pos2.as_str() {
            "名詞的" => "名詞",
            "形容詞的" => "形容詞",
            "動詞的" => "動詞",
            "形状詞" => "形容",
            _ => &token.partOfSpeech,
        }
        .to_string();
        join_tokens(tokens, from, from + 2, new_pos, true);
        Ok(true)
    }

    fn join_inflections(&mut self, tokens: &mut Vec<Token>, from: usize) -> YResult<bool> {
        let mut to = from + 1;
        let token = &tokens[from];
        if !(["動詞", "形容詞", "形状詞", "副詞", "=exp="].contains(&token.partOfSpeech.as_str()))
        {
            return Ok(false);
        }

        let mut joined_text = String::with_capacity(3 * 12);
        let mut joined_reading = String::with_capacity(3 * 12);
        joined_text += &token.text;
        joined_reading += &token.reading;
        while to < tokens.len()
            && (tokens[to].partOfSpeech == "助動詞" || tokens[to].pos2 == "接続助詞")
        {
            joined_text += &tokens[to].text;
            joined_reading += &tokens[to].reading;
            to += 1;
        }
        if to - from == 1 {
            return Ok(false);
        }

        let joined = Token {
            text: joined_text,
            reading: joined_reading,
            partOfSpeech: token.partOfSpeech.clone(),
            baseForm: token.baseForm.clone(),
            pos2: token.pos2.clone(),
            start: token.start,
        };
        tokens.splice(from..to, [joined]);
        return Ok(true);
    }

    fn manual_patches(&mut self, tokens: &mut Vec<Token>) {
        for token in tokens {
            // "じゃない" 「じゃ」 -> 「じゃ」 instead of 「だ」
            if &token.text == "じゃ" {
                token.baseForm = String::from("じゃ");
                token.partOfSpeech = String::from("接続詞");
                token.pos2 = String::from("*");
                token.reading = String::from("ジャ");
            // "じゃあ、" 「じゃあ」 -> 「じゃあ」, instead of 「で」
            } else if token.text == "じゃあ" {
                token.baseForm = String::from("じゃあ");
                token.partOfSpeech = String::from("接続詞");
                token.pos2 = String::from("*");
                token.reading = String::from("ジャー");
            }
        }
    }
}

pub fn create_tokenizer() -> Tokenizer {
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

/// Join and replace tokens[from..<to]
/// if `last_as_base`, joined token's `base` uses `token.base` for last token
fn join_tokens<S: Into<String>>(
    tokens: &mut Vec<Token>,
    from: usize,
    to: usize,
    pos: S,
    last_as_base: bool,
) {
    let size = to - from;
    if size == 1 {
        return;
    }

    let mut text = String::with_capacity(3 * 4 * size);
    let mut reading = String::with_capacity(3 * 4 * size);
    for i in from..to - 1 {
        text.push_str(&tokens[i].text);
        reading.push_str(&tokens[i].reading);
    }

    let mut base_form = text.clone();
    if last_as_base {
        base_form.push_str(&tokens[to - 1].baseForm);
    } else {
        base_form.push_str(&tokens[to - 1].text);
    }

    text.push_str(&tokens[to - 1].text);
    reading.push_str(&tokens[to - 1].reading);

    let joined = Token {
        text,
        partOfSpeech: pos.into(),
        reading,
        pos2: String::from("*"),
        baseForm: base_form,
        start: tokens[from].start,
    };
    tokens.splice(from..to, [joined]);
}

#[inline]
fn concat_string(s1: &str, s2: &str) -> String {
    let mut joined = String::with_capacity(s1.len() + s2.len());
    joined.push_str(s1);
    joined.push_str(s2);
    joined
}
