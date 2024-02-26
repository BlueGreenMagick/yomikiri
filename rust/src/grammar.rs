use crate::japanese::GoDan;
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
    pub detect: fn(&[Token], usize) -> bool,
}

static GRAMMARS: [GrammarRule; 2] = [
    GrammarRule {
        name: "ーられる",
        short: "passive suffix",
        tofugu: "https://www.tofugu.com/japanese-grammar/verb-passive-form-rareru/",
        detect: |tokens, idx| {
            let token = &tokens[idx];
            if token.base == "られる" && token.is_aux() {
                true
            } else if token.base == "れる" && token.is_aux() {
                if idx == 0 {
                    return false;
                }
                let prev = &tokens[idx - 1];

                if let Some(last_char) = prev.text.chars().last() {
                    let dan = GoDan::from_char(last_char);
                    dan == Some(GoDan::ADan)
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
        detect: |tokens, idx| {
            let token = &tokens[idx];
            token.base == "た" && token.is_aux() && (token.text == "た" || token.text == "だ")
        },
    },
];

impl Token {
    fn is_aux(&self) -> bool {
        self.pos == "助動詞"
    }

    pub fn grammar_infos(&self) -> Vec<&'static GrammarRule> {
        let mut grammar_infos = vec![];
        for (i, _token) in self.children.iter().enumerate() {
            for grammar in &GRAMMARS {
                let detect = grammar.detect;
                if detect(&self.children, i) {
                    grammar_infos.push(grammar);
                }
            }
        }
        grammar_infos
    }
}
