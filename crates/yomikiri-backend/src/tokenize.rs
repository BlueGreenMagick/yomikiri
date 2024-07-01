#![allow(non_snake_case)]

use crate::error::{YResult, YomikiriError};
use crate::grammar::{GrammarDetector, GrammarRule};
use crate::japanese::JapaneseString;
use crate::unidic::load_dictionary;
use crate::SharedBackend;
use lindera_core::mode::Mode;
use lindera_tokenizer::tokenizer::Tokenizer;
use std::borrow::Cow;
use std::io::{Read, Seek};
use unicode_normalization::{is_nfc, UnicodeNormalization};
use unicode_segmentation::UnicodeSegmentation;
use yomikiri_unidic_types::{UnidicConjugationForm, UnidicPos};

#[cfg(wasm)]
use serde::Serialize;

#[cfg_attr(wasm, derive(Serialize))]
#[cfg_attr(uniffi, derive(uniffi::Record))]
#[derive(Debug, Clone)]
pub struct Token {
    /// NFC normalized
    pub text: String,
    /// first code point index of token in pre-normalized sentence
    pub start: u32,
    pub children: Vec<Token>,
    // fields from TokenDetails
    pub pos: String,
    pub pos2: String,
    pub base: String,
    pub reading: String,
    pub conj_form: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct TokenDetails {
    /// defaults to `UNK`
    pub pos: String,
    /// defaults to `*`
    pub pos2: String,
    /// defaults to token surface or ``
    pub base: String,
    /// defaults to `*`
    pub reading: String,
    /// conjugation form
    ///
    /// defaults to `*`
    pub conj_form: String,
}

#[cfg_attr(wasm, derive(Serialize))]
#[cfg_attr(uniffi, derive(uniffi::Record))]
#[derive(Debug, Clone)]
pub struct GrammarInfo {
    pub name: String,
    pub short: String,
    pub tofugu: String,
}

impl From<&GrammarRule> for GrammarInfo {
    fn from(grammar: &GrammarRule) -> Self {
        GrammarInfo {
            name: grammar.name.into(),
            short: grammar.short.into(),
            tofugu: grammar.tofugu.into(),
        }
    }
}

#[cfg_attr(wasm, derive(Serialize))]
#[cfg_attr(uniffi, derive(uniffi::Record))]
#[derive(Debug, Default)]
pub struct RawTokenizeResult {
    pub tokens: Vec<Token>,
    /// selected token index
    ///
    /// may be -1 if no there
    pub tokenIdx: i32,
    /// DicEntry JSONs returned by lindera tokenizer
    /// searched with base and surface of selected token
    pub entries: Vec<String>,
    pub grammars: Vec<GrammarInfo>,
}

impl RawTokenizeResult {
    pub fn empty() -> Self {
        RawTokenizeResult {
            tokenIdx: -1,
            ..Default::default()
        }
    }
}

impl Token {
    pub fn new<S: Into<String>>(surface: S, details: TokenDetails, start: u32) -> Self {
        Token {
            text: surface.into(),
            start,
            children: vec![],
            pos: details.pos,
            pos2: details.pos2,
            base: details.base,
            reading: details.reading,
            conj_form: details.conj_form,
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
            conj_form: "*".into(),
        }
    }
}

impl TokenDetails {
    fn from_details(details: &[&str], surface: &str) -> Self {
        let mut details = details.iter();
        let (pos, pos2) = details
            .next()
            .and_then(|p| p.as_bytes().first())
            .and_then(|short| UnidicPos::from_short(*short).ok())
            .map(|pos| pos.to_unidic())
            .unwrap_or(("UNK", "*"));
        let pos = pos.to_string();
        let pos2 = pos2.to_string();
        let conj_form = details
            .next()
            .and_then(|p| p.as_bytes().first())
            .and_then(|short| UnidicConjugationForm::from_short(*short).ok())
            .map(|conj| conj.to_unidic())
            .unwrap_or("*")
            .to_string();
        let reading = details
            .next()
            .map(|r| {
                if r.is_empty() {
                    surface.to_katakana()
                } else {
                    r.to_string()
                }
            })
            .unwrap_or("*".into());
        let base = if let Some(base) = details.next() {
            if base.is_empty() {
                surface.into()
            } else {
                base.to_string()
            }
        } else {
            surface.into()
        };

        TokenDetails {
            pos,
            pos2,
            conj_form,
            base,
            reading,
        }
    }

    pub fn default_with_base(base: &str) -> Self {
        TokenDetails {
            base: base.into(),
            ..TokenDetails::default()
        }
    }
}

impl<R: Read + Seek> SharedBackend<R> {
    /// Tokenizes sentence and returns the tokens, and DicEntry of token that contains character at char_idx.
    ///
    /// char_idx: code point index of selected character in sentence
    pub fn tokenize(&mut self, sentence: &'_ str, char_idx: usize) -> YResult<RawTokenizeResult> {
        let mut tokens = self.tokenize_inner(sentence)?;
        if tokens.is_empty() {
            return Ok(RawTokenizeResult::empty());
        }

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

        let grammar_analyzer = GrammarDetector::new(&tokens, token_idx);
        let grammars = grammar_analyzer
            .detect()
            .into_iter()
            .map(GrammarInfo::from)
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

    /// `sentence` is tokenized and its output Vec<LinderaToken> is converted into Vec<Token>.
    ///
    /// if `sentence` is not in NFC normalized form, it is normalized before fed to lindera,
    /// and `token.start` is calculated as code point position in pre-normalized sentence.
    fn tokenize_inner(&self, sentence: &'_ str) -> YResult<Vec<Token>> {
        let is_normalized = is_nfc(sentence);
        let normalized_sentence = if is_normalized {
            Cow::Borrowed(sentence)
        } else {
            let normalized = sentence.nfc().collect::<String>();
            Cow::Owned(normalized)
        };

        let mut ltokens = self.tokenizer.tokenize(&normalized_sentence)?;
        let mut tokens = Vec::with_capacity(ltokens.capacity());

        let mut original_char_indices = sentence.char_indices().enumerate();
        let mut graphemes = if is_normalized {
            None
        } else {
            // Map byte index of normalized sentence to byte index of pre-normalized sentence.
            // Below code works because:
            // 1) All tok.byte_start are always grapheme cluster boundaries (because unidic)
            // 2) Grapheme cluster boundaries are always code point boundaries regardless of normalization. (Unicode spec)
            let original_graphemes = sentence.grapheme_indices(true);
            let normalized_graphemes = normalized_sentence.grapheme_indices(true);
            Some(original_graphemes.zip(normalized_graphemes))
        };

        for tok in &mut ltokens {
            let byte_start = if is_normalized {
                tok.byte_start
            } else {
                graphemes
                    .as_mut()
                    .unwrap()
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
                Some(d) => TokenDetails::from_details(&d, &text),
                None => TokenDetails::default_with_base(&text),
            };
            let token = Token::new(text, details, char_start as u32);
            tokens.push(token);
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
        self.join_dependent_verb(tokens, from)?;
        self.join_specific_verb(tokens, from)?;
        self.join_inflections(tokens, from)?;
        Ok(())
    }

    /// Join maximal expression tokens starting from tokens\[index\]
    ///
    /// Handles cases:
    ///     1. any+ => 'dict' exp
    ///     2. 名詞+ => 'dict' 名詞
    ///     3. 助詞+ => 'dict' 助詞  e.g. 「かも」、「では」
    ///     4. (名詞|代名詞) 助詞+ => 'dict' any  e.g. 「誰か」、「何とも」、「誠に」
    ///
    ///
    /// Search strategy (ordered):
    ///     1. '(text)+': join text of all tokens
    ///         used for all cases
    ///     2. '(text)+ (base)': join text of all tokens except last, and last's base
    ///         used for cases 1-2
    ///     3. '(base)+': join base of all tokens
    ///         used for case 3 e.g. んに「のに」
    fn join_compounds_multi(&mut self, tokens: &mut Vec<Token>, from: usize) -> YResult<bool> {
        let token = &tokens[from];
        let mut all_noun = token.pos == "名詞";
        let mut all_particle = token.pos == "助詞";
        let mut noun_particle = token.pos == "名詞" || token.pos == "代名詞";

        let mut at = from + 1;
        let mut joined_text_prev = token.text.clone();
        let mut joined_base_prev = token.base.clone();

        let mut searching_text_join = true;
        let mut searching_base_join = true;

        let mut last_found_to = at;
        let mut last_found_join_strategy = BaseJoinStrategy::TextAll;
        let mut last_found_pos: &str = &token.pos;

        while at < tokens.len() {
            let token = &tokens[at];
            all_noun = all_noun && token.pos == "名詞";
            all_particle = all_particle && token.pos == "助詞";
            noun_particle = noun_particle && token.pos == "助詞";

            if !all_particle {
                searching_base_join = false;
            }

            if searching_text_join {
                let text_all = concat_string(&joined_text_prev, &token.text);

                let mut found_pos = None;
                for e in self.dictionary.search(&text_all)?.iter() {
                    if all_noun && e.is_noun() {
                        found_pos = Some("名詞");
                        break;
                    } else if all_particle && e.is_particle() {
                        found_pos = Some("助詞");
                        break;
                    } else if noun_particle || e.is_expression() {
                        found_pos = Some("=exp=")
                    }
                }

                if let Some(pos) = found_pos {
                    last_found_to = at + 1;
                    last_found_pos = pos;
                    last_found_join_strategy = BaseJoinStrategy::TextAll;
                } else {
                    let text_then_base = concat_string(&joined_text_prev, &token.base);
                    let mut found_pos = None;
                    for e in self.dictionary.search(&text_then_base)?.iter() {
                        if all_noun && e.is_noun() {
                            found_pos = Some("名詞");
                            break;
                        } else if noun_particle || e.is_expression() {
                            found_pos = Some("=exp=")
                        }
                    }

                    if let Some(pos) = found_pos {
                        last_found_to = at + 1;
                        last_found_pos = pos;
                        last_found_join_strategy = BaseJoinStrategy::TextWithLastBase;
                    }
                }

                // no more `text_all` or `text_then_base` exist in dictionary
                searching_text_join = self.dictionary.has_starts_with_excluding(&text_all);
                joined_text_prev = text_all;
            }

            if searching_base_join {
                let base_all = concat_string(&joined_base_prev, &token.base);
                // text_all and text_then_base did not find an entry this iteration
                if last_found_to != at + 1 {
                    let found = self
                        .dictionary
                        .search(&base_all)?
                        .iter()
                        .any(|e| e.is_particle());
                    if found {
                        last_found_to = at + 1;
                        last_found_pos = "助詞";
                        last_found_join_strategy = BaseJoinStrategy::BaseAll;
                    }
                }

                searching_base_join = self.dictionary.has_starts_with_excluding(&base_all);
                joined_base_prev = base_all;
            }

            // no need to search anymore
            if !searching_text_join && !searching_base_join {
                break;
            }
            at += 1;
        }

        let pos = String::from(last_found_pos);
        join_tokens(tokens, from, last_found_to, pos, last_found_join_strategy);
        Ok(last_found_to - from > 1)
    }

    /// (接頭詞) (any) => 'dict' (any)
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
        Ok(true)
    }

    /// (連体詞) (名詞 | 代名詞 | 接頭辞) => 'dict' (any)
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
        Ok(true)
    }

    /// (any) (助詞) => 'dict' 接続詞
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

        join_tokens(tokens, from, from + 2, "接続詞", BaseJoinStrategy::TextAll);
        Ok(true)
    }

    /// (any) (接尾辞) => 'dict' 名詞 | 形容詞 | 動詞 | 形状詞
    ///
    /// ーがる is joined even if it does not exist in dictionary
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
        let new_pos = match next_token.pos2.as_str() {
            "名詞的" => "名詞",
            "形容詞的" => "形容詞",
            "動詞的" => "動詞",
            "形状詞的" => "形状詞",
            // unreachable
            _ => &token.pos,
        }
        .to_string();
        let compound = concat_string(&token.text, &next_token.base);
        let exists = self.dictionary.contains(&compound);

        if !exists {
            if next_token.base == "がる" {
                join_tokens(tokens, from, from + 2, new_pos, BaseJoinStrategy::FirstBase);
                Ok(true)
            } else {
                Ok(false)
            }
        } else {
            join_tokens(
                tokens,
                from,
                from + 2,
                new_pos,
                BaseJoinStrategy::TextWithLastBase,
            );
            Ok(true)
        }
    }

    /// 動詞 動詞／非自立可能 => 'dict' 動詞
    fn join_dependent_verb(&mut self, tokens: &mut Vec<Token>, from: usize) -> YResult<bool> {
        if from + 1 >= tokens.len() {
            return Ok(false);
        }
        let token = &tokens[from];
        let next = &tokens[from + 1];

        if next.pos2 != "非自立可能" || !token.is_verb() {
            return Ok(false);
        }

        let compound = concat_string(&token.text, &next.base);
        let exists = self.dictionary.search(&compound)?.iter().any(|e| e.is_verb());
        if !exists {
            return Ok(false);
        }

        join_tokens(
            tokens,
            from,
            from + 2,
            "動詞",
            BaseJoinStrategy::TextWithLastBase
        );
        Ok(true)
    }

    /// ? + 動詞 -> 動詞
    ///
    /// When next token are certain verbs,
    /// they may be joined with current token.
    ///
    /// 1. 名詞 + する
    /// 2. 動詞 + なさい「為さる」
    fn join_specific_verb(&mut self, tokens: &mut Vec<Token>, from: usize) -> YResult<bool> {
        if from + 1 >= tokens.len() {
            return Ok(false);
        }
        let token = &tokens[from];
        let next = &tokens[from + 1];

        if next.base == "為る" && next.pos2 == "非自立可能" && token.is_noun() {
            join_tokens(tokens, from, from + 2, "動詞", BaseJoinStrategy::FirstBase);
            return Ok(true);
        };

        if next.text == "なさい"
            && next.base == "為さる"
            && next.pos2 == "非自立可能"
            && token.is_verb()
        {
            join_tokens(tokens, from, from + 2, "動詞", BaseJoinStrategy::FirstBase);
            return Ok(true);
        };

        Ok(false)
    }

    /// (動詞 | 形容詞 | 形状詞 | 副詞 | 助動詞 | exp) (kana-only 助動詞 | 助詞/接続助詞 | 形状詞/助動詞語幹)+ => $1
    fn join_inflections(&mut self, tokens: &mut Vec<Token>, from: usize) -> YResult<bool> {
        let mut to = from + 1;
        let token = &tokens[from];
        if !(["動詞", "形容詞", "形状詞", "副詞", "助動詞", "=exp="].contains(&token.pos.as_str()))
        {
            return Ok(false);
        }

        let mut joined_text = String::with_capacity(3 * 12);
        let mut joined_reading = String::with_capacity(3 * 12);
        joined_text += &token.text;
        joined_reading += &token.reading;
        while to < tokens.len()
            && (tokens[to].pos == "助動詞"
                || tokens[to].pos2 == "接続助詞"
                || (tokens[to].pos2 == "助動詞語幹" && tokens[to].pos == "形状詞"))
            && tokens[to].text.contains_only_kana()
        {
            to += 1;
        }

        let pos = token.pos.clone();
        join_tokens(tokens, from, to, &pos, BaseJoinStrategy::FirstBase);
        Ok(to - from > 1)
    }

    #[allow(clippy::if_same_then_else)]
    fn manual_patches(&mut self, tokens: &mut [Token]) {
        for i in 0..tokens.len() {
            let token = &tokens[i];

            // 私「ワタクシ」 -> 「ワタシ」
            if token.text == "私" && token.reading == "ワタクシ" {
                tokens[i].reading = "ワタシ".into();
                continue;
            }
            // 助詞 'と' that follows 終止形 動詞/助動詞 is always 接続助詞
            // fixes tokenization and grammar
            else if token.base == "と"
                && token.text == "と"
                && token.pos2 == "格助詞"
                && i > 0
                && tokens[i - 1].conj_form.starts_with("終止形")
            {
                tokens[i].pos2 = "接続助詞".into()
            }
            // 助詞 'ーたり' used for listing should be joined with previous 用言
            // and other sources list 「ーたり」 as 接続助詞
            else if token.base == "たり" && token.pos2 == "副助詞" {
                tokens[i].pos2 = "接続助詞".into()
            }
            // は/よそう「止す」 rather than は／よそう「装う」
            // 「装う」 still turns up in the dictionary after patch
            else if token.base == "装う"
                && token.text == "よそう"
                && i > 0
                && tokens[i - 1].base == "は"
            {
                tokens[i].base = "止す".into();
                tokens[i].pos2 = "一般".into();
                tokens[i].conj_form = "意志推量形".into();
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
    TextAll,
    /// join `text` of all tokens except last token's `base`
    TextWithLastBase,
    /// use first token's `base`
    FirstBase,
    /// join `base` of all tokens
    BaseAll,
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
    for token in &tokens[from..to - 1] {
        reading.push_str(&token.reading);
        text.push_str(&token.text);
    }

    let base = match base_strategy {
        BaseJoinStrategy::FirstBase => tokens[from].base.clone(),
        BaseJoinStrategy::TextAll => concat_string(&text, &tokens[to - 1].text),
        BaseJoinStrategy::TextWithLastBase => concat_string(&text, &tokens[to - 1].base),
        BaseJoinStrategy::BaseAll => tokens
            .iter()
            .map(|t| t.base.as_str())
            .collect::<Vec<&str>>()
            .join(""),
    };

    text.push_str(&tokens[to - 1].text);
    reading.push_str(&tokens[to - 1].reading);

    let mut children: Vec<Token> = Vec::with_capacity(2 * (to - from));
    for token in &mut tokens[from..to] {
        if token.children.is_empty() {
            children.push(token.clone());
        } else {
            children.append(&mut token.children);
        }
    }

    let joined = Token {
        text,
        pos: pos.into(),
        children,
        reading,
        base,
        pos2: String::from("*"),
        conj_form: String::from("*"),
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
