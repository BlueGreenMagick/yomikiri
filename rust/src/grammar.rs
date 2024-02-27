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
    detect: fn(&Token, &GrammarDetector) -> bool,
}

struct GrammarDetector<'a> {
    pub tokens: &'a [Token],
    pub idx: usize,
}

impl<'a> GrammarDetector<'a> {
    fn new(tokens: &'a [Token]) -> Self {
        Self { tokens, idx: 0 }
    }

    /// get previous verb / adj token looking from `idx` backwards
    fn prev_yougen(&self) -> Option<&Token> {
        if self.idx == 0 {
            return None;
        }
        self.tokens[0..self.idx - 1]
            .iter()
            .rev()
            .find(|&token| token.is_adj() || token.is_verb())
    }

    /// returns previous token
    fn prev(&self) -> Option<&Token> {
        if self.idx == 0 {
            None
        } else {
            self.tokens.get(self.idx - 1)
        }
    }

    /// returns next token
    fn next(&self) -> Option<&Token> {
        self.tokens.get(self.idx + 1)
    }

    /// Runs `check(prev)` on previous token and return its value.
    /// Returns `false` if current is first token.
    fn prev_is(&self, check: fn(&Token) -> bool) -> bool {
        if let Some(prev) = self.prev() {
            check(prev)
        } else {
            false
        }
    }

    /// Runs `check(next)` on next token and return its value.
    /// Returns `false` if current is first token.
    fn next_is(&self, check: fn(&Token) -> bool) -> bool {
        if let Some(next) = self.next() {
            check(next)
        } else {
            false
        }
    }

    fn detect(&mut self) -> Vec<&'static GrammarRule> {
        let mut grammars = vec![];
        for (i, token) in self.tokens.iter().enumerate() {
            self.idx = i;
            for grammar in GRAMMARS {
                let detect = grammar.detect;

                if detect(token, &*self) {
                    grammars.push(grammar);
                }
            }
        }
        grammars
    }
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
        let tokens = if self.children.is_empty() {
            Cow::Owned(vec![self.clone()])
        } else {
            Cow::Borrowed(&self.children)
        };

        let mut detector = GrammarDetector::new(&tokens);
        detector.detect()
    }
}

static GRAMMARS: &[GrammarRule] = &[
    GrammarRule {
        name: "ーさ",
        short: "objective noun",
        tofugu: "https://www.tofugu.com/japanese-grammar/adjective-suffix-sa/",
        detect: |token, _| token.base == "さ" && token.is_suf(),
    },
    GrammarRule {
        name: "ーそう",
        short: "speculative adjective",
        tofugu: "https://www.tofugu.com/japanese-grammar/adjective-sou/",
        detect: |token, data| {
            token.base == "そう" && token.is_naadj() && data.prev_is(|prev| prev.is_adj())
        },
    },
    GrammarRule {
        name: "ーえ／ーろ",
        short: "command form",
        tofugu: "https://www.tofugu.com/japanese-grammar/verb-command-form-ro/",
        detect: |token, _| token.conj_form == "命令形",
    },
    GrammarRule {
        name: "ので",
        short: "cause (so)",
        tofugu: "https://www.tofugu.com/japanese-grammar/conjunctive-particle-node/",
        detect: |token, data| {
            token.base == "だ"
                && token.text == "で"
                && token.is_aux()
                && data.prev_is(|prev| prev.base == "の" && prev.pos2 == "準体助詞")
        },
    },
    GrammarRule {
        name: "のに",
        short: "unexpectedness (but)",
        tofugu: "https://www.tofugu.com/japanese-grammar/conjunctive-particle-noni/",
        detect: |token, data| {
            token.base == "に"
                && token.text == "に"
                && token.is_particle()
                && data.prev_is(|prev| prev.base == "の" && prev.pos2 == "準体助詞")
        },
    },
    GrammarRule {
        name: "ーが",
        short: "contrast (but)",
        tofugu: "https://www.tofugu.com/japanese-grammar/conjunctive-particle-ga-kedo/",
        detect: |token, _| token.base == "が" && token.is_conn_particle(),
    },
    GrammarRule {
        name: "ーけど／ーけれど",
        short: "contrast (but)",
        tofugu: "https://www.tofugu.com/japanese-grammar/conjunctive-particle-ga-kedo/",
        detect: |token, _| token.base == "けれど" && token.is_conn_particle(),
    },
    GrammarRule {
        name: "おー",
        short: "honorific",
        tofugu: "https://www.tofugu.com/japanese-grammar/honorific-prefix-o-go/",
        detect: |token, _| token.base == "御" && token.is_prefix(),
    },
    GrammarRule {
        name: "ーか",
        short: "unknown",
        tofugu: "https://www.tofugu.com/japanese-grammar/particle-ka/",
        detect: |token, _| token.base == "か" && token.is_particle(),
    },
    GrammarRule {
        name: "ーから",
        short: "source",
        tofugu: "https://www.tofugu.com/japanese-grammar/particle-kara/",
        detect: |token, _| token.base == "から" && token.is_particle(),
    },
    GrammarRule {
        name: "が",
        short: "subject",
        tofugu: "https://www.tofugu.com/japanese-grammar/particle-ga/",
        detect: |token, _| token.base == "が" && token.pos2 == "格助詞",
    },
    GrammarRule {
        name: "で",
        short: "where; how",
        tofugu: "https://www.tofugu.com/japanese-grammar/particle-de/",
        detect: |token, _| token.base == "で" && token.is_particle(),
    },
    GrammarRule {
        name: "と",
        short: "together; quote",
        tofugu: "https://www.tofugu.com/japanese-grammar/particle-to/",
        detect: |token, _| token.base == "と" && token.pos2 == "格助詞",
    },
    GrammarRule {
        name: "と",
        short: "causal relationship",
        tofugu: "https://www.tofugu.com/japanese-grammar/verb-to/",
        detect: |token, _| token.base == "と" && token.text == "と" && token.pos2 == "接続助詞",
    },
    GrammarRule {
        name: "に",
        short: "location; time; purpose; state; ...",
        tofugu: "https://www.tofugu.com/japanese-grammar/particle-ni/",
        detect: |token, data| {
            (token.base == "に"
                && token.is_particle()
                && !data.prev_is(|prev| prev.base == "の" && prev.pos2 == "準体助詞"))
                || (token.text == "に" && token.base == "だ" && token.is_aux())
        },
    },
    GrammarRule {
        name: "ね",
        short: "consensus with listener",
        tofugu: "https://www.tofugu.com/japanese-grammar/particle-ne/",
        detect: |token, _| token.base == "ね" && token.is_particle(),
    },
    GrammarRule {
        name: "ーの",
        short: "noun form; explanatory",
        tofugu: "https://www.tofugu.com/japanese-grammar/particle-no-nominalizer/",
        detect: |token, _| {
            token.base == "の" && (token.pos2 == "準体助詞" || token.pos2 == "終助詞")
        },
    },
    GrammarRule {
        name: "の",
        short: "possessive; apposition",
        tofugu: "https://www.tofugu.com/japanese-grammar/particle-no-nominalizer/",
        detect: |token, _| token.base == "の" && token.pos2 == "格助詞",
    },
    GrammarRule {
        name: "は",
        short: "topic",
        tofugu: "https://www.tofugu.com/japanese-grammar/particle-wa/",
        detect: |token, _| token.base == "は" && token.is_particle(),
    },
    GrammarRule {
        name: "へ",
        short: "destination; direction",
        tofugu: "https://www.tofugu.com/japanese-grammar/particle-he/",
        detect: |token, _| token.base == "へ" && token.is_particle(),
    },
    GrammarRule {
        name: "まで",
        short: "end point",
        tofugu: "https://www.tofugu.com/japanese-grammar/particle-made/",
        detect: |token, _| token.base == "まで" && token.is_particle(),
    },
    GrammarRule {
        name: "も",
        short: "also",
        tofugu: "https://www.tofugu.com/japanese-grammar/particle-mo/",
        detect: |token, _| token.base == "も" && token.is_particle(),
    },
    GrammarRule {
        name: "や",
        short: "list",
        tofugu: "https://www.tofugu.com/japanese-grammar/particle-ya/",
        detect: |token, _| token.base == "や" && token.is_particle(),
    },
    GrammarRule {
        name: "よ",
        short: "informative",
        tofugu: "https://www.tofugu.com/japanese-grammar/particle-yo/",
        detect: |token, data| {
            token.base == "よ"
                && token.is_particle()
                && !data.next_is(|next| next.base == "ね" && next.is_particle())
        },
    },
    GrammarRule {
        name: "よね",
        short: "confirmation",
        tofugu: "https://www.tofugu.com/japanese-grammar/particle-yone/",
        detect: |token, data| {
            token.base == "ね"
                && token.is_particle()
                && data.prev_is(|prev| prev.base == "よ" && prev.is_particle())
        },
    },
    GrammarRule {
        name: "より",
        short: "comparison (than...); source (from)",
        tofugu: "https://www.tofugu.com/japanese-grammar/particle-yori-than/",
        detect: |token, data| token.base == "より" && token.is_particle(),
    },
    GrammarRule {
        name: "わ",
        short: "personal sentiment; willingness",
        tofugu: "https://www.tofugu.com/japanese-grammar/sentence-ending-particle-wa/",
        detect: |token, data| token.base == "わ" && token.is_particle(),
    },
    GrammarRule {
        name: "を",
        short: "grammatical object",
        tofugu: "https://www.tofugu.com/japanese-grammar/particle-wo/",
        detect: |token, data| token.base == "を" && token.is_particle(),
    },
    GrammarRule {
        name: "ーられる",
        short: "passive suffix",
        tofugu: "https://www.tofugu.com/japanese-grammar/verb-passive-form-rareru/",
        detect: |token, data| {
            (token.base == "られる" && token.is_aux())
                || (token.base == "れる"
                    && token.is_aux()
                    && data.prev_is(|prev| prev.text.ends_in_go_dan() == Some(GoDan::ADan)))
        },
    },
    GrammarRule {
        name: "ーた",
        short: "past tense",
        tofugu: "https://www.tofugu.com/japanese-grammar/verb-past-ta-form/",
        detect: |token, _| {
            token.base == "た" && token.is_aux() && (token.text == "た" || token.text == "だ")
        },
    },
];
