use std::borrow::Cow;

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

    fn is_verb(&self) -> bool {
        self.pos == "動詞"
    }

    fn is_particle(&self) -> bool {
        self.pos == "助詞"
    }

    fn is_conn_particle(&self) -> bool {
        self.pos2 == "接続助詞"
    }

    fn is_prefix(&self) -> bool {
        self.pos == "接頭辞"
    }

    pub fn grammars(&self) -> Vec<&'static GrammarRule> {
        let mut grammars = vec![];
        let children = if self.children.is_empty() {
            Cow::Owned(vec![self.clone()])
        } else {
            Cow::Borrowed(&self.children)
        };

        for (i, token) in children.iter().enumerate() {
            for grammar in GRAMMARS {
                let detect = grammar.detect;

                if detect(token, &children, i) {
                    grammars.push(grammar);
                }
            }
        }
        grammars
    }
}

/// get previous verb / adj token looking from `idx`` backwards
fn prev_yougen(tokens: &[Token], idx: usize) -> Option<&Token> {
    if idx == 0 {
        return None;
    }
    for token in tokens[0..idx - 1].iter().rev() {
        if token.is_adj() || token.is_verb() {
            return Some(token);
        }
    }
    None
}

trait GetPrev {
    fn get_prev(&self, idx: usize) -> Option<&Token>;
}

impl GetPrev for &[Token] {
    fn get_prev(&self, idx: usize) -> Option<&Token> {
        if idx == 0 {
            None
        } else {
            self.get(idx - 1)
        }
    }
}

static GRAMMARS: &[GrammarRule] = &[
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
                if let Some(prev) = tokens.get_prev(idx) {
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
        name: "ーえ／ーろ",
        short: "command form",
        tofugu: "https://www.tofugu.com/japanese-grammar/verb-command-form-ro/",
        detect: |token, _, _| token.conj_form == "命令形",
    },
    GrammarRule {
        name: "ので",
        short: "cause (so)",
        tofugu: "https://www.tofugu.com/japanese-grammar/conjunctive-particle-node/",
        detect: |token, tokens, idx| {
            if token.base == "だ" && token.text == "で" && token.is_aux() {
                if let Some(prev) = tokens.get_prev(idx) {
                    prev.base == "の" && prev.pos2 == "準体助詞"
                } else {
                    false
                }
            } else {
                false
            }
        },
    },
    GrammarRule {
        name: "のに",
        short: "unexpectedness (but)",
        tofugu: "https://www.tofugu.com/japanese-grammar/conjunctive-particle-noni/",
        detect: |token, tokens, idx| {
            if token.base == "に" && token.text == "に" && token.is_particle() {
                if let Some(prev) = tokens.get_prev(idx) {
                    prev.base == "の" && prev.text == "の" && prev.pos2 == "準体助詞"
                } else {
                    false
                }
            } else {
                false
            }
        },
    },
    GrammarRule {
        name: "ーが",
        short: "contrast (but)",
        tofugu: "https://www.tofugu.com/japanese-grammar/conjunctive-particle-ga-kedo/",
        detect: |token, _, _| token.base == "が" && token.is_conn_particle(),
    },
    GrammarRule {
        name: "ーけど／ーけれど",
        short: "contrast (but)",
        tofugu: "https://www.tofugu.com/japanese-grammar/conjunctive-particle-ga-kedo/",
        detect: |token, _, _| token.base == "けれど" && token.is_conn_particle(),
    },
    GrammarRule {
        name: "おー",
        short: "honorific",
        tofugu: "https://www.tofugu.com/japanese-grammar/honorific-prefix-o-go/",
        detect: |token, _, _| token.base == "御" && token.is_prefix(),
    },
    GrammarRule {
        name: "ーか",
        short: "unknown",
        tofugu: "https://www.tofugu.com/japanese-grammar/particle-ka/",
        detect: |token, _, _| token.base == "か" && token.is_particle(),
    },
    GrammarRule {
        name: "ーから",
        short: "source",
        tofugu: "https://www.tofugu.com/japanese-grammar/particle-kara/",
        detect: |token, _, _| token.base == "から" && token.is_particle(),
    },
    GrammarRule {
        name: "が",
        short: "subject",
        tofugu: "https://www.tofugu.com/japanese-grammar/particle-ga/",
        detect: |token, _, _| token.base == "が" && token.pos2 == "格助詞",
    },
    GrammarRule {
        name: "で",
        short: "where; how",
        tofugu: "https://www.tofugu.com/japanese-grammar/particle-de/",
        detect: |token, tokens, _| token.base == "で" && token.is_particle(),
    },
    GrammarRule {
        name: "と",
        short: "together; quote",
        tofugu: "https://www.tofugu.com/japanese-grammar/particle-to/",
        detect: |token, tokens, idx| token.base == "と" && token.pos2 == "格助詞",
    },
    GrammarRule {
        name: "と",
        short: "causal relationship",
        tofugu: "https://www.tofugu.com/japanese-grammar/verb-to/",
        detect: |token, tokens, idx| {
            token.base == "と" && token.text == "と" && token.pos2 == "接続助詞"
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
                if let Some(prev) = tokens.get_prev(idx) {
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
