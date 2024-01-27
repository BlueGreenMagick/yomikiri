#![allow(non_snake_case)]

use crate::error::{YResult, YomikiriError};
use crate::SharedBackend;
use std::io::{Read, Seek};
use unicode_normalization::UnicodeNormalization;
use unicode_segmentation::UnicodeSegmentation;
use vibrato::Tokenizer;
use yomikiri_unidic_dictionary::load_dictionary;

#[cfg(wasm)]
use serde::Serialize;

#[cfg_attr(wasm, derive(Serialize))]
#[cfg_attr(uniffi, derive(uniffi::Record))]
#[derive(Debug, Clone)]
pub struct Token {
    pub text: String,
    /// start idx
    pub start: u32,

    /// fields from TokenDetails
    pub pos: String,
    pub pos2: String,
    pub base: String,
    pub reading: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
struct TokenDetails {
    /// defaults to `UNK`
    pub pos: String,
    /// defaults to `*`
    pub pos2: String,
    /// defaults to token surface or ``
    pub base: String,
    /// defaults to `*`
    pub reading: String,
}

#[cfg_attr(wasm, derive(Serialize))]
#[cfg_attr(uniffi, derive(uniffi::Record))]
pub struct RawTokenizeResult {
    pub tokens: Vec<Token>,
    /// selected token index
    pub tokenIdx: u32,
    /// DicEntry JSONs returned by lindera tokenizer
    /// searched with base and surface of selected token
    pub mainEntries: Vec<String>,
}

impl Token {
    fn new<S: Into<String>>(surface: S, details: TokenDetails, start: u32) -> Self {
        Token {
            text: surface.into(),
            start,
            pos: details.pos,
            pos2: details.pos2,
            base: details.base,
            reading: details.reading,
        }
    }
}

impl Default for TokenDetails {
    fn default() -> Self {
        TokenDetails {
            pos: "UNK".into(),
            pos2: "*".into(),
            base: "".into(),
            reading: "*".into(),
        }
    }
}

impl TokenDetails {
    fn from_feature(feature: &str, surface: &str) -> TokenDetails {
        let mut iter_features = feature.split(",");
        let pos = iter_features.next().unwrap_or(&"UNK");
        let pos2 = iter_features.next().unwrap_or(&"*");
        let reading = iter_features.next().unwrap_or(&"*");
        let base = iter_features.next().unwrap_or(surface);

        TokenDetails {
            pos: pos.into(),
            pos2: pos2.into(),
            base: base.into(),
            reading: reading.into(),
        }
    }
}

trait JapaneseChar {
    /** Character is hiragana or katakana */
    fn is_kana(&self) -> bool;
}

impl JapaneseChar for char {
    fn is_kana(&self) -> bool {
        match *self {
            '\u{3040}'..='\u{309f}' => true,
            _ => false,
        }
    }
}

impl<R: Read + Seek> SharedBackend<R> {
    /// Tokenizes sentence and returns the tokens, and DicEntry of token that contains character at char_idx.
    ///
    /// if `raw`, return lindera tokenize result without joining tokens
    /// only used in wasm for debugging purposes
    pub fn tokenize<'a>(
        &mut self,
        sentence: &'a str,
        char_idx: usize,
        raw: bool,
    ) -> YResult<RawTokenizeResult> {
        let mut tokens = self.tokenize_inner(sentence)?;

        if !raw {
            self.manual_patches(&mut tokens);
            self.join_all_tokens(&mut tokens)?;
        }

        let token_idx = match tokens.iter().position(|t| (t.start as usize) > char_idx) {
            Some(i) => i - 1,
            None => tokens.len() - 1,
        };

        let selected_token = &tokens[token_idx];

        // 1) joined base
        let mut main_entries = self.dictionary.search_json(&selected_token.base)?;

        // 2) joined surface
        if selected_token.base != selected_token.text {
            let entries = self.dictionary.search_json(&selected_token.text)?;
            for entry in entries {
                if !main_entries.contains(&entry) {
                    main_entries.push(entry);
                }
            }
        }

        Ok(RawTokenizeResult {
            tokens,
            tokenIdx: token_idx.try_into().map_err(|_| {
                YomikiriError::ConversionError("Failed to convert token_idx as u32.".into())
            })?,
            mainEntries: main_entries,
        })
    }

    // `sentence`` is tokenized and the result is converted into vector of Token.
    // `sentence` may not be unicode normalized, but lindera only accepts normalized text.
    // byte position on unnormalized sentence is calculated from normalized byte position
    fn tokenize_inner<'a>(&self, sentence: &'a str) -> YResult<Vec<Token>> {
        let normalized_sentence = sentence.nfc().collect::<String>();
        let already_normalized: bool = sentence == normalized_sentence;

        let mut worker = self.tokenizer.new_worker();
        worker.reset_sentence(&normalized_sentence);
        worker.tokenize();

        let mut tokens = Vec::with_capacity(worker.num_tokens());

        // iterator of starting indices of each graphemes
        let original_graphemes = sentence.grapheme_indices(true);
        let normalized_graphemes = normalized_sentence.grapheme_indices(true);
        let mut graphemes = original_graphemes.zip(normalized_graphemes);

        let mut original_char_indices = sentence.char_indices().enumerate();

        for tok in worker.token_iter() {
            let tok_byte_start = tok.range_byte().start;
            // starting byte index of original sentence
            let byte_start = if already_normalized {
                tok_byte_start
            } else {
                graphemes
                    .find_map(|((original_idx, _), (normalized_idx, _))| {
                        if normalized_idx == tok_byte_start {
                            Some(original_idx)
                        } else {
                            None
                        }
                    })
                    .ok_or(YomikiriError::BytePositionError)?
            };
            let char_start = original_char_indices
                .find_map(|(i, (a, _))| if a == byte_start { Some(i) } else { None })
                .ok_or(YomikiriError::BytePositionError)?;

            let text = tok.surface().to_string();
            let details = TokenDetails::from_feature(tok.feature(), &text);

            let token = Token::new(text, details, char_start as u32);
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
        let mut all_noun = token.pos == "名詞";
        let mut all_particle = token.pos == "助詞";

        let mut to = from + 1;
        let mut joined_text_prev = token.text.clone();

        let mut last_found_to = to;
        let mut last_found_is_base = true;
        let mut last_found_pos: &str = &token.pos;

        while to < tokens.len() {
            let token = &tokens[to];
            all_noun = all_noun && token.pos == "名詞";
            all_particle = all_particle && token.pos == "助詞";

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
                let joined_text_base = concat_string(&joined_text_prev, &token.base);
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
        join_tokens(tokens, from, last_found_to, pos, false);
        return Ok(to - from > 1);
    }

    /// (接頭詞) (any) => (any)
    fn join_prefix(&mut self, tokens: &mut Vec<Token>, from: usize) -> YResult<bool> {
        if from + 1 >= tokens.len() {
            return Ok(false);
        }
        let token = &tokens[from];
        if token.pos != "接頭辞" {
            return Ok(false);
        }

        let next_token = &tokens[from + 1];
        let compound = concat_string(&token.text, &next_token.base);
        let exists = self.dictionary.contains(&compound);
        if !exists {
            return Ok(false);
        }

        let pos = String::from(&next_token.pos);
        join_tokens(tokens, from, from + 2, pos, true);
        return Ok(true);
    }

    /// (連体詞) (名詞 | 代名詞 | 接頭辞) => (any)
    fn join_pre_noun(&mut self, tokens: &mut Vec<Token>, from: usize) -> YResult<bool> {
        if from + 1 >= tokens.len() {
            return Ok(false);
        }
        let token = &tokens[from];
        if token.pos != "連体詞" {
            return Ok(false);
        }
        let next_token = &tokens[from + 1];
        let next_pos = &next_token.pos;
        if next_pos != "名詞" && next_pos != "代名詞" && next_pos != "接頭辞" {
            return Ok(false);
        }

        let compound = concat_string(&token.text, &next_token.base);
        let exists = self.dictionary.contains(&compound);
        if !exists {
            return Ok(false);
        }

        let pos = String::from(next_pos);
        join_tokens(tokens, from, from + 2, pos, true);
        return Ok(true);
    }

    /// (any) (助詞) => 接続詞
    ///
    /// Join any that ends with 助詞 because
    /// unidic is not good at determining if a given 助詞 is 接続助詞
    fn join_conjunction(&mut self, tokens: &mut Vec<Token>, from: usize) -> YResult<bool> {
        if from + 1 >= tokens.len() {
            return Ok(false);
        }
        let next_token = &tokens[from + 1];
        if next_token.pos != "助詞" {
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

    /// (any) (接尾辞) => 名詞 | 形容詞 | 動詞 | 形状詞
    ///
    /// e.g. お<母「名詞」さん「接尾辞／名詞的」>だ
    fn join_suffix(&mut self, tokens: &mut Vec<Token>, from: usize) -> YResult<bool> {
        if from + 1 >= tokens.len() {
            return Ok(false);
        }
        let next_token = &tokens[from + 1];
        if next_token.pos != "接尾辞" {
            return Ok(false);
        }

        let token = &tokens[from];
        let compound = concat_string(&token.text, &next_token.base);
        let exists = self.dictionary.contains(&compound);
        if !exists {
            return Ok(false);
        }

        let new_pos = match next_token.pos2.as_str() {
            "名詞的" => "名詞",
            "形容詞的" => "形容詞",
            "動詞的" => "動詞",
            "形状詞的" => "形状詞",
            _ => &token.pos,
        }
        .to_string();
        join_tokens(tokens, from, from + 2, new_pos, true);
        Ok(true)
    }

    /// (動詞 | 形容詞 | 形状詞 | 副詞 | exp) (kana-only 助動詞 | 助詞/接続助詞)+ => $1
    fn join_inflections(&mut self, tokens: &mut Vec<Token>, from: usize) -> YResult<bool> {
        let mut to = from + 1;
        let token = &tokens[from];
        if !(["動詞", "形容詞", "形状詞", "副詞", "=exp="].contains(&token.pos.as_str()))
        {
            return Ok(false);
        }

        let mut joined_text = String::with_capacity(3 * 12);
        let mut joined_reading = String::with_capacity(3 * 12);
        joined_text += &token.text;
        joined_reading += &token.reading;
        while to < tokens.len()
            && (tokens[to].pos == "助動詞" || tokens[to].pos2 == "接続助詞")
            && contains_only_kana(&tokens[to].text)
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
            pos: token.pos.clone(),
            base: token.base.clone(),
            pos2: token.pos2.clone(),
            start: token.start,
        };
        tokens.splice(from..to, [joined]);
        return Ok(true);
    }

    fn manual_patches(&mut self, tokens: &mut Vec<Token>) {
        for i in 0..tokens.len() {
            let token = &tokens[i];

            // 私「ワタクシ」 -> 「ワタシ」
            if token.text == "私" && token.reading == "ワタクシ" {
                tokens[i].reading = "ワタシ".into();
                continue;
            }

            // 1. （形状詞）な　e.g. 静かな
            // 2. （名詞）な（名詞） e.g.  医者なこと
            if token.text == "な" && token.base != "だ" && i > 0 {
                let mut to_replace = false;
                let prev_token = &tokens[i - 1];
                if prev_token.pos == "形状詞" {
                    to_replace = true;
                }
                if !to_replace && prev_token.pos == "名詞" && i + 1 < tokens.len() {
                    let next_token = &tokens[i + 1];
                    if next_token.pos == "名詞" {
                        to_replace = true;
                    }
                }
                if to_replace {
                    tokens[i].base = "だ".into();
                    tokens[i].reading = "ナ".into();
                    tokens[i].pos = "助動詞".into();
                    tokens[i].pos2 = "*".into();
                }
            }
        }
    }
}

pub fn create_tokenizer() -> Tokenizer {
    let dictionary = load_dictionary().unwrap();
    Tokenizer::new(dictionary).max_grouping_len(24)
}

/// Join and replace `tokens[from..<to]`
///
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
        base_form.push_str(&tokens[to - 1].base);
    } else {
        base_form.push_str(&tokens[to - 1].text);
    }

    text.push_str(&tokens[to - 1].text);
    reading.push_str(&tokens[to - 1].reading);

    let joined = Token {
        text,
        pos: pos.into(),
        reading,
        pos2: String::from("*"),
        base: base_form,
        start: tokens[from].start,
    };
    tokens.splice(from..to, [joined]);
}

fn concat_string(s1: &str, s2: &str) -> String {
    let mut joined = String::with_capacity(s1.len() + s2.len());
    joined.push_str(s1);
    joined.push_str(s2);
    joined
}

fn contains_only_kana(text: &str) -> bool {
    text.chars().all(|c| c.is_kana())
}
