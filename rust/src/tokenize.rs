#![allow(non_snake_case)]

use crate::error::{YResult, YomikiriError};
use crate::grammar::GrammarInfo;
use crate::japanese::JapaneseChar;
use crate::unidic::load_dictionary;
use crate::SharedBackend;
use lindera_core::mode::Mode;
use lindera_tokenizer::tokenizer::Tokenizer;
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
    /// character position of token in tokenized sentence
    ///
    /// Note that difference between token.start may not equal `text.len()`
    /// if sentence is not in NFC-normalized form.
    pub start: u32,
    pub children: Vec<Token>,
    // fields from TokenDetails
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
#[derive(Debug, Clone)]
pub struct GrammarInfoOut {
    pub name: String,
    pub short: String,
    pub tofugu: String,
}

impl From<&GrammarInfo> for GrammarInfoOut {
    fn from(grammar: &GrammarInfo) -> Self {
        GrammarInfoOut {
            name: grammar.name.into(),
            short: grammar.short.into(),
            tofugu: grammar.tofugu.into(),
        }
    }
}

#[cfg_attr(wasm, derive(Serialize))]
#[cfg_attr(uniffi, derive(uniffi::Record))]
pub struct RawTokenizeResult {
    pub tokens: Vec<Token>,
    /// selected token index
    pub tokenIdx: u32,
    /// DicEntry JSONs returned by lindera tokenizer
    /// searched with base and surface of selected token
    pub entries: Vec<String>,
    pub grammars: Vec<GrammarInfoOut>,
}

impl Token {
    fn new<S: Into<String>>(surface: S, details: TokenDetails, start: u32) -> Self {
        Token {
            text: surface.into(),
            start,
            children: vec![],
            pos: details.pos,
            pos2: details.pos2,
            base: details.base,
            reading: details.reading,
        }
    }

    fn without_children(token: &Token) -> Self {
        Token {
            text: token.text.clone(),
            start: token.start,
            children: vec![],
            pos: token.pos.clone(),
            pos2: token.pos2.clone(),
            base: token.base.clone(),
            reading: token.reading.clone(),
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
    fn from_details(details: &[&str]) -> Self {
        TokenDetails {
            pos: details.get(0).unwrap_or(&"UNK").to_string(),
            pos2: details.get(1).unwrap_or(&"*").to_string(),
            base: details.get(3).unwrap_or(&"").to_string(),
            reading: details.get(2).unwrap_or(&"*").to_string(),
        }
    }

    fn default_with_surface(surface: &str) -> Self {
        TokenDetails {
            base: surface.into(),
            ..TokenDetails::default()
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
    ) -> YResult<RawTokenizeResult> {
        let mut tokens = self.tokenize_inner(sentence)?;

        self.manual_patches(&mut tokens);
        self.join_all_tokens(&mut tokens)?;

        let token_idx = match tokens.iter().position(|t| (t.start as usize) > char_idx) {
            Some(i) => i - 1,
            None => tokens.len() - 1,
        };

        let selected_token = &tokens[token_idx];

        // 1) joined base
        let mut entries = self.dictionary.search_json(&selected_token.base)?;

        // 2) joined surface
        if selected_token.base != selected_token.text {
            let searched_entries = self.dictionary.search_json(&selected_token.text)?;
            for entry in searched_entries {
                if !entries.contains(&entry) {
                    entries.push(entry);
                }
            }
        }

        let grammars = selected_token
            .grammar_infos()
            .into_iter()
            .map(GrammarInfoOut::from)
            .collect();

        Ok(RawTokenizeResult {
            tokens,
            tokenIdx: token_idx.try_into().map_err(|_| {
                YomikiriError::ConversionError("Failed to convert token_idx as u32.".into())
            })?,
            entries,
            grammars,
        })
    }

    /// `sentence`` is tokenized and the result is converted into vector of Token.
    ///
    /// if `sentence` is not in NFC normalized form, it is normalized before fed to lindera,
    /// and `token.start` is calculated as character position in pre-normalized sentence.
    fn tokenize_inner<'a>(&self, sentence: &'a str) -> YResult<Vec<Token>> {
        let normalized_sentence = sentence.nfc().collect::<String>();
        let already_normalized: bool = sentence == normalized_sentence;

        let mut ltokens = self.tokenizer.tokenize(&normalized_sentence)?;
        let mut tokens = Vec::with_capacity(ltokens.capacity());

        // iterator of starting indices of each graphemes
        let original_graphemes = sentence.grapheme_indices(true);
        let normalized_graphemes = normalized_sentence.grapheme_indices(true);
        let mut graphemes = original_graphemes.zip(normalized_graphemes);

        let mut original_char_indices = sentence.char_indices().enumerate();

        for tok in &mut ltokens {
            // starting byte index of original sentence
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
            let char_start = original_char_indices
                .find_map(|(i, (a, _))| if a == byte_start { Some(i) } else { None })
                .ok_or(YomikiriError::BytePositionError)?;

            let text = tok.text.to_string();
            let details = match tok.get_details() {
                Some(d) => TokenDetails::from_details(&d),
                None => TokenDetails::default_with_surface(&text),
            };

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
        let mut base_join_strategy = BaseJoinStrategy::TextWithLastBase;
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
                base_join_strategy = BaseJoinStrategy::Text;
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
                    base_join_strategy = BaseJoinStrategy::TextWithLastBase;
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
                join_tokens(tokens, from, last_found_to, pos, base_join_strategy);
                return Ok(last_found_to - from > 1);
            }
            joined_text_prev = joined_text;
            to += 1;
        }

        let pos = String::from(last_found_pos);
        join_tokens(tokens, from, last_found_to, pos, BaseJoinStrategy::Text);
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
        join_tokens(
            tokens,
            from,
            from + 2,
            pos,
            BaseJoinStrategy::TextWithLastBase,
        );
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
        join_tokens(
            tokens,
            from,
            from + 2,
            pos,
            BaseJoinStrategy::TextWithLastBase,
        );
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

        join_tokens(tokens, from, from + 2, "接続詞", BaseJoinStrategy::Text);
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
        join_tokens(
            tokens,
            from,
            from + 2,
            new_pos,
            BaseJoinStrategy::TextWithLastBase,
        );
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
            to += 1;
        }

        let pos = token.pos.clone();
        join_tokens(tokens, from, to, &pos, BaseJoinStrategy::FirstBase);
        return Ok(to - from > 1);
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
    Tokenizer::new(dictionary, None, Mode::Normal)
}

enum BaseJoinStrategy {
    /// join `text` of all tokens
    Text,
    /// join `text` of all tokens except last token's `base`
    TextWithLastBase,
    /// use first token's `base`
    FirstBase,
}

/// Join and replace `tokens[from..<to]`.
///
/// `text`, `reading` is the joined `text` and `reading` values.
///
/// `base` is the joined `text` values.
/// if `last_as_base`, joined token's `base` uses `base` for last token
fn join_tokens<S: Into<String>>(
    tokens: &mut Vec<Token>,
    from: usize,
    to: usize,
    pos: S,
    base_strategy: BaseJoinStrategy,
) {
    let size = to - from;
    if size == 1 {
        return;
    }

    let mut text = String::with_capacity(3 * 4 * size);
    let mut reading = String::with_capacity(3 * 4 * size);
    for i in from..to - 1 {
        reading.push_str(&tokens[i].reading);
        text.push_str(&tokens[i].text);
    }

    let base = match base_strategy {
        BaseJoinStrategy::FirstBase => tokens[from].base.clone(),
        BaseJoinStrategy::Text => concat_string(&text, &tokens[to - 1].text),
        BaseJoinStrategy::TextWithLastBase => concat_string(&text, &tokens[to - 1].base),
    };

    text.push_str(&tokens[to - 1].text);
    reading.push_str(&tokens[to - 1].reading);

    let mut children: Vec<Token> = Vec::with_capacity(2 * (to - from));
    for i in from..to {
        if tokens[i].children.is_empty() {
            children.push(Token::without_children(&tokens[i]));
        } else {
            children.append(&mut tokens[i].children);
        }
    }

    let joined = Token {
        text,
        pos: pos.into(),
        children,
        reading,
        base,
        pos2: String::from("*"),
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
