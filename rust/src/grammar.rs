use crate::tokenize::Token;

#[cfg(wasm)]
use serde::Serialize;

#[cfg_attr(wasm, derive(Serialize))]
#[cfg_attr(uniffi, derive(uniffi::Record))]
#[derive(Debug, Clone)]
pub struct GrammarInfo {
    pub term: String,
    pub description: String,
    pub url: String,
}

impl GrammarInfo {
    fn new<A, B, C>(term: A, description: B, url: C) -> Self
    where
        A: Into<String>,
        B: Into<String>,
        C: Into<String>,
    {
        GrammarInfo {
            term: term.into(),
            description: description.into(),
            url: url.into(),
        }
    }
}

pub struct GrammarAnalyzer<'a> {
    tokens: &'a [Token],
    grammars: Vec<GrammarInfo>,
    pos: usize,
}

impl GrammarAnalyzer<'_> {
    pub fn new<'a>(tokens: &'a [Token]) -> GrammarAnalyzer<'a> {
        GrammarAnalyzer {
            tokens,
            grammars: vec![],
            pos: 0,
        }
    }

    pub fn analyze(mut self) -> Vec<GrammarInfo> {
        while self.pos < self.tokens.len() {
            if self.tokens[self.pos].pos == "助動詞" || self.tokens[self.pos].pos2 == "接続助詞"
            {
                if let Some(info) = self.inflection() {
                    self.grammars.push(info);
                }
            }
            self.pos += 1;
        }

        self.grammars
    }

    fn inflection(&mut self) -> Option<GrammarInfo> {
        let token = &self.tokens[self.pos];

        let grammar = match token.base.as_str() {
            "から" => GrammarInfo::new(
                "から",
                "Reason",
                "https://www.tofugu.com/japanese-grammar/particle-kara/#actionstate--",
            ),
            "か" => GrammarInfo::new(
                "か",
                "Question, alternative, unknown",
                "https://www.tofugu.com/japanese-grammar/particle-ka/",
            ),
            "がんす" => GrammarInfo::new("がんす", "(Uncommon) polite", ""),
            "けれど" => GrammarInfo::new(
                "けれど",
                "But",
                "https://www.tofugu.com/japanese-grammar/conjunctive-particle-ga-kedo/",
            ),
            "し" => GrammarInfo::new(
                "し",
                "And what's more",
                "https://www.tofugu.com/japanese-grammar/shi/",
            ),
            "ながら" => GrammarInfo::new(
                "ながら",
                "Although; while",
                "https://www.tofugu.com/japanese-grammar/nagara/",
            ),
            _ => return None,
        };
        Some(grammar)
    }
}
