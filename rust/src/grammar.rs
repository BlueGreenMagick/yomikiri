use crate::japanese::{GoDan, GoDanEnding};
use crate::tokenize::Token;

#[cfg(wasm)]
use serde::Serialize;

pub struct GrammarRule {
    pub name: &'static str,
    /// short description
    pub short: &'static str,
    /// tofugu url
    pub tofugu: &'static str,
    /// (children, current index)
    pub detect: fn(&Token, &[Token], usize) -> bool,
}

impl Token {
    fn is_aux(&self) -> bool {
        self.pos == "助動詞"
    }

    fn is_suf(&self) -> bool {
        self.pos == "接尾辞"
    }

    fn is_adj(&self) -> bool {
        self.is_iadj() || self.is_naadj()
    }

    fn is_iadj(&self) -> bool {
        self.pos == "形容詞"
    }

    fn is_naadj(&self) -> bool {
        self.pos == "形状詞"
    }

    fn is_noun(&self) -> bool {
        self.pos == "名詞"
    }

    pub fn grammars(&self) -> Vec<&'static GrammarRule> {
        let mut grammars = vec![];
        for (i, token) in self.children.iter().enumerate() {
            for grammar in &GRAMMARS {
                let detect = grammar.detect;
                if detect(token, &self.children, i) {
                    grammars.push(grammar);
                }
            }
        }
        grammars
    }
}

static GRAMMARS: [GrammarRule; 4] = [
    GrammarRule {
        name: "ーさ",
        short: "objective noun",
        tofugu: "https://www.tofugu.com/japanese-grammar/adjective-suffix-sa/",
        detect: |token, _, _| token.base == "さ" && token.is_suf(),
    },
    GrammarRule {
        name: "ーそう",
        short: "speculative adjective",
        tofugu: "https://www.tofugu.com/japanese-grammar/adjective-sou/",
        detect: |token, tokens, idx| {
            if token.base == "そう" && token.is_naadj() {
                if let Some(prev) = tokens.get(idx - 1) {
                    prev.is_adj()
                } else {
                    false
                }
            } else {
                false
            }
        },
    },
    GrammarRule {
        name: "ーられる",
        short: "passive suffix",
        tofugu: "https://www.tofugu.com/japanese-grammar/verb-passive-form-rareru/",
        detect: |token, tokens, idx| {
            if token.base == "られる" && token.is_aux() {
                true
            } else if token.base == "れる" && token.is_aux() {
                if let Some(prev) = tokens.get(idx - 1) {
                    prev.text.ends_in_go_dan() == Some(GoDan::ADan)
                } else {
                    false
                }
            } else {
                false
            }
        },
    },
    GrammarRule {
        name: "ーた",
        short: "past tense",
        tofugu: "https://www.tofugu.com/japanese-grammar/verb-past-ta-form/",
        detect: |token, _, _| {
            token.base == "た" && token.is_aux() && (token.text == "た" || token.text == "だ")
        },
    },
];
