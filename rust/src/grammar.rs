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

pub struct GrammarDetector<'a> {
    grammars: Vec<&'static GrammarRule>,
    // all tokens in sentence
    global_tokens: &'a [Token],
    global_idx: usize,
    // tokens in current token
    group: Cow<'a, Vec<Token>>,
    idx: usize,
}

impl<'a> GrammarDetector<'a> {
    pub fn new(tokens: &'a [Token], idx: usize) -> Self {
        let curr = &tokens[idx];
        let group = if curr.children.is_empty() {
            Cow::Owned(vec![curr.clone()])
        } else {
            Cow::Borrowed(&curr.children)
        };

        Self {
            grammars: vec![],
            global_tokens: tokens,
            global_idx: idx,
            group: group,
            idx: 0,
        }
    }

    /// get previous verb / adj token looking from `idx` backwards
    fn prev_yougen(&self) -> Option<&Token> {
        self.group[0..self.idx]
            .iter()
            .rev()
            .find(|&token| token.is_yougen())
    }

    fn prev_independent(&self) -> Option<&Token> {
        self.group[0..self.idx]
            .iter()
            .rev()
            .find(|&token| token.is_independant())
    }

    /// returns previous token in current token group
    fn prev(&self) -> Option<&Token> {
        if self.idx == 0 {
            None
        } else {
            self.group.get(self.idx - 1)
        }
    }

    /// returns previous global token
    /// which may not be in the current token group
    fn global_prev(&self) -> Option<&Token> {
        if let Some(prev) = self.prev() {
            Some(prev)
        } else if self.global_idx > 0 {
            let prev = &self.global_tokens[self.global_idx - 1];
            if prev.children.is_empty() {
                Some(&prev)
            } else {
                prev.children.last()
            }
        } else {
            None
        }
    }

    /// returns next global token
    /// which may not be in the current token group
    fn global_next(&self) -> Option<&Token> {
        if let Some(next) = self.next() {
            Some(next)
        } else {
            self.global_tokens.get(self.global_idx + 1).map(|next| {
                if next.children.is_empty() {
                    next
                } else {
                    &next.children[0]
                }
            })
        }
    }

    /// returns next token in current token group
    fn next(&self) -> Option<&Token> {
        self.group.get(self.idx + 1)
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

    /// Runs `check(prev)` on previous global token and return its value.
    /// Returns `false` if current is first token.
    fn global_prev_is(&self, check: fn(&Token) -> bool) -> bool {
        if let Some(prev) = self.global_prev() {
            check(prev)
        } else {
            false
        }
    }

    /// Runs `check(next)` on next global token and return its value.
    /// Returns `false` if current is first token.
    fn global_next_is(&self, check: fn(&Token) -> bool) -> bool {
        if let Some(next) = self.global_next() {
            check(next)
        } else {
            false
        }
    }

    pub fn detect(mut self) -> Vec<&'static GrammarRule> {
        for (i, token) in self.group.iter().enumerate() {
            self.idx = i;
            for grammar in GRAMMARS {
                let detect = grammar.detect;

                if detect(token, &self) {
                    self.grammars.push(grammar);
                }
            }
        }
        self.grammars
    }
}

impl Token {
    pub fn is_aux(&self) -> bool {
        self.pos == "助動詞"
    }

    pub fn is_suf(&self) -> bool {
        self.pos == "接尾辞"
    }

    pub fn is_adj(&self) -> bool {
        self.is_iadj() || self.is_naadj()
    }

    pub fn is_iadj(&self) -> bool {
        self.pos == "形容詞"
    }

    pub fn is_naadj(&self) -> bool {
        self.pos == "形状詞"
    }

    pub fn is_noun(&self) -> bool {
        self.pos == "名詞"
    }

    pub fn is_verb(&self) -> bool {
        self.pos == "動詞"
    }

    pub fn is_particle(&self) -> bool {
        self.pos == "助詞"
    }

    pub fn is_conn_particle(&self) -> bool {
        self.pos2 == "接続助詞"
    }

    pub fn is_prefix(&self) -> bool {
        self.pos == "接頭辞"
    }

    pub fn is_pronoun(&self) -> bool {
        self.pos == "代名詞"
    }

    pub fn is_adverb(&self) -> bool {
        self.pos == "副詞"
    }

    pub fn is_adnomial(&self) -> bool {
        self.pos == "連体詞"
    }

    pub fn is_conjunction(&self) -> bool {
        self.pos == "接続詞"
    }

    pub fn is_interjection(&self) -> bool {
        self.pos == "感動詞"
    }

    pub fn is_unknown_pos(&self) -> bool {
        self.pos == "UNK" || self.pos == "" || self.pos == "*"
    }

    //　用言
    pub fn is_yougen(&self) -> bool {
        self.is_verb() || self.is_iadj() || self.is_naadj()
    }
    // 体言
    pub fn is_taigen(&self) -> bool {
        self.is_noun() || self.is_pronoun()
    }

    // 自立語. Note that not-independant verbs are also returned as well.
    pub fn is_independant(&self) -> bool {
        self.is_yougen()
            || self.is_taigen()
            || self.is_adnomial()
            || self.is_adverb()
            || self.is_conjunction()
            || self.is_interjection()
    }
}

static GRAMMARS: &[GrammarRule] = &[
    // # Adjective Forms
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
    // this rule will only be displayed if joined-word is not in unidic
    GrammarRule {
        name: "ーがる",
        short: "seems to be ...",
        tofugu: "https://www.tofugu.com/japanese-grammar/i-adjective-garu/",
        detect: |token, data| token.base == "がる" && token.is_suf(),
    },
    GrammarRule {
        name: "ーければ",
        short: "conditional form (if, when)",
        tofugu: "https://www.tofugu.com/japanese-grammar/i-adjective-conditional-form-kereba/",
        detect: |token, data| {
            token.base == "ば"
                && token.is_conn_particle()
                && data.prev_is(|prev| prev.is_iadj() && prev.text.ends_with("けれ"))
        },
    },
    // # Verb Forms
    GrammarRule {
        name: "ーえ／ーろ",
        short: "command form",
        tofugu: "https://www.tofugu.com/japanese-grammar/verb-command-form-ro/",
        detect: |token, _| token.conj_form == "命令形",
    },
    // 連体形 and 終止形 are the same for verbs. (And for others except 形状詞)
    GrammarRule {
        name: "ーる",
        short: "plain form; present/future",
        tofugu: "https://www.tofugu.com/japanese-grammar/verb-plain-present-form/",
        detect: |token, _| {
            token.is_verb()
                && (token.conj_form == "連体形-一般" || token.conj_form == "終止形-一般")
        },
    },
    GrammarRule {
        name: "ーそう",
        short: "looks like ... will happen",
        tofugu: "https://www.tofugu.com/japanese-grammar/verb-sou/",
        detect: |token, data| {
            token.base == "そう" && token.is_naadj() && data.prev_is(|prev| prev.is_verb())
        },
    },
    GrammarRule {
        name: "ーせる／ーさせる",
        short: "causative form",
        tofugu: "https://www.tofugu.com/japanese-grammar/verb-causative-form-saseru/",
        detect: |token, _| (token.base == "せる" || token.base == "させる") && token.is_aux(),
    },
    GrammarRule {
        name: "ーたい",
        short: "desire",
        tofugu: "https://www.tofugu.com/japanese-grammar/tai-form/",
        detect: |token, _| token.base == "たい" && token.is_aux(),
    },
    GrammarRule {
        name: "ーたがる",
        short: "another's desire",
        tofugu: "https://www.tofugu.com/japanese-grammar/tagaru-form/",
        detect: |token, _| token.base == "たがる" && token.is_aux(),
    },
    GrammarRule {
        name: "ーたら",
        short: "when; after; if",
        tofugu: "https://www.tofugu.com/japanese-grammar/conditional-form-tara/",
        detect: |token, _| token.base == "た" && token.text == "たら" && token.is_aux(),
    },
    GrammarRule {
        name: "ーたり",
        short: "(incomplete) list",
        tofugu: "https://www.tofugu.com/japanese-grammar/tarisuru/",
        detect: |token, _| token.base == "たり" && token.is_particle(),
    },
    GrammarRule {
        name: "ーてある",
        short: "current state",
        tofugu: "https://www.tofugu.com/japanese-grammar/tearu/",
        detect: |token, data| {
            token.base == "有る" && data.global_prev_is(|prev| prev.base == "て")
                || token.base == "ない" && data.global_prev_is(|prev| prev.text == "て")
        },
    },
    GrammarRule {
        name: "ーていく",
        short: "process started; to go",
        tofugu: "https://www.tofugu.com/japanese-grammar/teiku-tekuru/",
        detect: |token, data| token.base == "行く" && data.global_prev_is(|prev| prev.base == "て"),
    },
    GrammarRule {
        name: "ーてくる",
        short: "process done; to come; become able",
        tofugu: "https://www.tofugu.com/japanese-grammar/teiku-tekuru/",
        detect: |token, data| token.base == "来る" && data.global_prev_is(|prev| prev.base == "て"),
    },
    // skipping ーていた as it is also covered by ーている + ーた and difficult detect in e.g. 「ていませんでした」
    GrammarRule {
        name: "ーている",
        short: "ongoing action; result of past action",
        tofugu: "https://www.tofugu.com/japanese-grammar/verb-continuous-form-teiru/",
        detect: |token, data| token.base == "居る" && data.global_prev_is(|prev| prev.base == "て"),
    },
    GrammarRule {
        name: "ーておく",
        short: "do in advance",
        tofugu: "https://www.tofugu.com/japanese-grammar/teoku/",
        detect: |token, data| token.base == "置く" && data.global_prev_is(|prev| prev.base == "て"),
    },
    GrammarRule {
        name: "ーてほしい",
        short: "want something to happen",
        tofugu: "https://www.tofugu.com/japanese-grammar/tehoshii/",
        detect: |token, data| {
            token.base == "欲しい" && data.global_prev_is(|prev| prev.base == "て")
        },
    },
    // although tofugu separates even between the verb + ーながら
    // it is impossible to distinguish between the two by analyzing grammar
    // and 'while' has both meanings 'simultaneous' and 'contrast' anyway
    GrammarRule {
        name: "ーながら",
        short: "while",
        tofugu: "https://www.tofugu.com/japanese-grammar/verb-nagara/",
        detect: |token, data| {
            token.base == "ながら"
                && token.is_particle()
                && data
                    .prev_independent()
                    .map(|token| token.is_verb())
                    .unwrap_or(false)
        },
    },
    GrammarRule {
        name: "ーなさい",
        short: "polite command",
        tofugu: "https://www.tofugu.com/japanese-grammar/verb-imperative-form-nasai/",
        detect: |token, data| {
            token.text == "なさい" && token.base == "為さる" && token.pos2 == "非自立可能"
        },
    },
    GrammarRule {
        name: "ーにくい",
        short: "difficult",
        tofugu: "https://www.tofugu.com/japanese-grammar/nikui/",
        detect: |token, data| {
            token.text == "にくい"
                && token.base == "難い"
                && token.is_suf()
                && data.global_prev_is(|prev| prev.is_verb())
        },
    },
    GrammarRule {
        name: "ーば",
        short: "conditional (if)",
        tofugu: "https://www.tofugu.com/japanese-grammar/verb-conditional-form-ba/",
        detect: |token, data| {
            token.base == "ば"
                && token.is_conn_particle()
                && !data.prev_is(|prev| prev.is_iadj() && prev.text.ends_with("けれ"))
        },
    },
    GrammarRule {
        name: "ーやすい",
        short: "easy",
        tofugu: "https://www.tofugu.com/japanese-grammar/yasui/",
        detect: |token, data| {
            token.base == "易い"
                && token.text == "やすい"
                && data.global_prev_is(|prev| prev.is_verb())
        },
    },
    GrammarRule {
        name: "ー(よ)う",
        short: "volition",
        tofugu: "https://www.tofugu.com/japanese-grammar/verb-volitional-form-you/",
        detect: |token, data| token.conj_form == "意志推量形",
    },
    // it is impossible to accurately figure out passive and potential forms
    // skipping godan potential　ーえる as it is impossible to figure out
    //
    // godan passive
    GrammarRule {
        name: "ー（ら）れる",
        short: "passive form",
        tofugu: "https://www.tofugu.com/japanese-grammar/verb-passive-form-rareru/",
        detect: |token, data| {
            (token.base == "れる"
                && token.is_aux()
                && data.prev_is(|prev| prev.text.ends_in_go_dan() == Some(GoDan::ADan)))
        },
    },
    // ichidan passive, potential, polite form
    GrammarRule {
        name: "ーられる",
        short: "passive form; potential form; polite form",
        tofugu: "https://www.tofugu.com/japanese-grammar/verb-passive-form-rareru/",
        detect: |token, data| token.base == "られる" && token.is_aux(),
    },
    // # Particles
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
        name: "ーけど",
        short: "contrast (but)",
        tofugu: "https://www.tofugu.com/japanese-grammar/conjunctive-particle-ga-kedo/",
        detect: |token, _| {
            token.base == "けれど" && token.is_conn_particle() && !token.text.starts_with("けれど")
        },
    },
    GrammarRule {
        name: "ーけれど",
        short: "contrast (but)",
        tofugu: "https://www.tofugu.com/japanese-grammar/conjunctive-particle-ga-kedo/",
        detect: |token, _| {
            token.base == "けれど" && token.is_conn_particle() && token.text.starts_with("けれど")
        },
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
        detect: |token, data| {
            token.base == "で"
                && token.is_particle()
                // exclude ーではない
                && !(token.text == "で"
                    && data.group.len() > data.idx + 2
                    && data.group[data.idx + 1].text == "は"
                    && data.group[data.idx + 1].is_particle()
                    && data.group[data.idx + 2].base == "無い")
        },
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
        detect: |token, data| {
            token.base == "は"
                && token.is_particle()
                // exclude ではない
                && !(token.text == "は"
                    && data.prev_is(|prev| prev.text == "で")
                    && data.next_is(|next| next.base == "無い"))
        },
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
        detect: |token, _data| token.base == "より" && token.is_particle(),
    },
    GrammarRule {
        name: "わ",
        short: "personal sentiment; willingness",
        tofugu: "https://www.tofugu.com/japanese-grammar/sentence-ending-particle-wa/",
        detect: |token, _data| token.base == "わ" && token.is_particle(),
    },
    GrammarRule {
        name: "を",
        short: "grammatical object",
        tofugu: "https://www.tofugu.com/japanese-grammar/particle-wo/",
        detect: |token, _data| token.base == "を" && token.is_particle(),
    },
    GrammarRule {
        name: "ーし",
        short: "what's more...",
        tofugu: "https://www.tofugu.com/japanese-grammar/shi/",
        detect: |token, _data| token.base == "し" && token.is_conn_particle(),
    },
    GrammarRule {
        name: "ーな",
        short: "don't...!",
        tofugu: "https://www.tofugu.com/japanese-grammar/na/",
        detect: |token, data| {
            (token.base == "な" && token.pos2 == "終助詞") ||
            // な is not usually tokenized correctly
            (token.text == "な"
                && data.next().is_none()
                && !data.global_next_is(|next| !next.is_unknown_pos())
                && data.global_prev_is(|prev| prev.conj_form.starts_with("終止形")))
                || (token.text == "んな"
                    && data.next().is_none()
                    && !data.global_next_is(|next| !next.is_unknown_pos())
                    && data.global_prev_is(|prev| prev.conj_form.starts_with("連用形")))
        },
    },
    GrammarRule {
        name: "くらい",
        short: "approximation",
        tofugu: "https://www.tofugu.com/japanese-grammar/kurai/",
        detect: |token, data| token.base == "くらい",
    },
    GrammarRule {
        name: "ーだけ",
        short: "only",
        tofugu: "https://www.tofugu.com/japanese-grammar/dake/",
        detect: |token, data| token.base == "だけ" && token.is_particle(),
    },
    GrammarRule {
        name: "ーなら",
        short: "if",
        tofugu: "https://www.tofugu.com/japanese-grammar/conditional-form-nara/",
        detect: |token, data| token.text == "なら" && token.is_aux(),
    },
    // # Clause Link
    GrammarRule {
        name: "ーながら",
        short: "contrast (although)",
        tofugu: "https://www.tofugu.com/japanese-grammar/nagara/",
        detect: |token, data| {
            token.base == "ながら"
                && token.is_particle()
                // exclude verbながら
                && !data
                    .prev_independent()
                    .map(|token| token.is_verb())
                    .unwrap_or(false)
        },
    },
    // # Prefix
    GrammarRule {
        name: "おー",
        short: "honorific",
        tofugu: "https://www.tofugu.com/japanese-grammar/honorific-prefix-o-go/",
        detect: |token, _| token.base == "御" && token.is_prefix(),
    },
    // # Pronoun
    GrammarRule {
        name: "私／僕／俺／うち",
        short: "I",
        tofugu: "https://www.tofugu.com/japanese-grammar/first-person-pronouns",
        detect: |token, _data| {
            token.is_pronoun() && ["私", "僕", "俺", "うち"].contains(&token.base.as_str())
        },
    },
    GrammarRule {
        name: "あなた／君／お前",
        short: "you",
        tofugu: "https://www.tofugu.com/japanese-grammar/first-person-pronouns",
        detect: |token, _data| {
            token.is_pronoun() && ["貴方", "君", "御前", "貴様"].contains(&token.base.as_str())
        },
    },
    GrammarRule {
        name: "彼／彼女／こいつ／そいつ／あいつ",
        short: "he/she/they",
        tofugu: "https://www.tofugu.com/japanese-grammar/first-person-pronouns",
        detect: |token, _data| {
            token.is_pronoun()
                && ["彼", "彼女", "此奴", "其奴", "彼奴"].contains(&token.base.as_str())
        },
    },
    // # Plain, Negative, Past
    // plain: 動詞：(ーる)／ーます、名詞｜形状詞：ーだ,、名詞｜形状詞|形容詞：ーです
    // negative: 動詞：ーない／ーません、形容詞：ーくない、名詞｜形状詞：ーじゃない／ーではない
    // past: 動詞：ーた／ーました、形容詞：ーかった、名詞｜形状詞：ーだった／ーでした
    // negative-past: 動詞：ーませんでした、動詞｜形容詞：ーなかった、名詞｜形状詞ーじゃなかった／ーではなかった
    GrammarRule {
        name: "ーます",
        short: "present tense (polite)",
        tofugu: "https://www.tofugu.com/japanese-grammar/masu/",
        detect: |token, data| {
            token.base == "ます"
            // exclude ーました
                && !(token.text == "まし" && data.next_is(|next| next.text == "た" && next.base == "た"))
            // exclude ーません／ーませんでした
                && !(token.text == "ませ" && data.next_is(|next| next.text == "ん"))
        },
    },
    GrammarRule {
        name: "ーだ",
        short: "positive present tense",
        tofugu: "https://www.tofugu.com/japanese-grammar/da/",
        detect: |token, data| token.base == "だ" && token.text == "だ" && token.is_aux(),
    },
    GrammarRule {
        name: "ーです",
        short: "present tense (polite)",
        tofugu: "https://www.tofugu.com/japanese-grammar/desu/",
        detect: |token, data| token.base == "です" && token.text == "です" && token.is_aux(),
    },
    GrammarRule {
        name: "ーない",
        short: "not",
        tofugu: "https://www.tofugu.com/japanese-grammar/verb-negative-nai-form/",
        detect: |token, data| {
            data.idx != 0
                //　exclude 無い (形容詞＋くない、名詞｜形状詞＋じゃない)
                && token.base == "ない"
                // exclude なかった
                && !(token.text == "なかっ" && data.next_is(|next| next.base == "た"))
        },
    },
    GrammarRule {
        name: "ーません",
        short: "not (polite)",
        tofugu: "https://www.tofugu.com/japanese-grammar/verb-negative-nai-form/",
        detect: |token, data| {
            data.idx >= 1
                && token.text == "ん"
                && data.group[data.idx - 1].base == "ます"
                && data.group[data.idx - 1].text == "ませ"
                // exclude ませんでした
                && !(data.group.len() - data.idx >= 2
                    && data.group[data.idx + 1].text == "でし"
                    && data.group[data.idx + 2].text == "た")
        },
    },
    GrammarRule {
        name: "ーくない",
        short: "not",
        tofugu: "https://www.tofugu.com/japanese-grammar/i-adjective-negative-form-kunai/",
        detect: |token, data| token.base == "無い" && data.global_prev_is(|prev| prev.is_iadj()),
    },
    GrammarRule {
        name: "ーじゃない",
        short: "not",
        tofugu: "https://www.tofugu.com/japanese-grammar/janai-dewanai/",
        detect: |token, data| {
            token.base == "無い"
                && data.global_prev_is(|prev| prev.text == "じゃ" && prev.is_aux())
                // exclude ーじゃなかった
                && !(token.text == "なかっ" && data.next_is(|next| next.base == "た"))
        },
    },
    // does not identify 形状詞 + ではない as those are across 3 global tokens
    // which is difficult to support for little gain
    GrammarRule {
        name: "ーではない",
        short: "not",
        tofugu: "https://www.tofugu.com/japanese-grammar/janai-dewanai/",
        detect: |token, data| {
            token.base == "無い"
                && (
                data.idx >= 2
                && data.group[data.idx - 2].text == "で"
                && data.group[data.idx - 1].text == "は"
                && data.group[data.idx - 1].is_particle()
                )
                // exclude ーではなかった
                && !(token.text == "なかっ" && data.next_is(|next| next.base == "た"))
        },
    },
    GrammarRule {
        name: "ーた",
        short: "past tense",
        tofugu: "https://www.tofugu.com/japanese-grammar/verb-past-ta-form/",
        detect: |token, data| {
            token.base == "た" && token.is_aux() && (token.text == "た" || token.text == "だ")
            && data.prev_is(|prev| !prev.is_adj())
            && !data.prev_is(|prev|
                // exclude ーました
                (prev.base == "ます" && prev.text == "まし")
                // exclude ーでした、ーませんでした
                || prev.text == "でし"
                // exclude ーだった
                || prev.text == "だっ"
                // exclude ーかった
                || prev.is_iadj()
            )
            // exclude なかった、ーじゃなかった、ーではなかった
            && !data.prev_is(|prev| prev.text == "なかっ")
        },
    },
    GrammarRule {
        name: "ーました",
        short: "past tense (polite)",
        tofugu: "https://www.tofugu.com/japanese-grammar/masu/#the-past-tense-of-",
        detect: |token, data| {
            token.base == "た"
                && token.text == "た"
                && data.prev_is(|prev| prev.base == "ます" && prev.text == "まし")
        },
    },
    GrammarRule {
        name: "ーかった",
        short: "past tense",
        tofugu: "https://www.tofugu.com/japanese-grammar/i-adjective-past-form-katta/",
        detect: |token, data| {
            token.base == "た"
                && token.text == "た"
                && data.prev_is(|prev| {
                    prev.is_iadj()
                    // exclude なかった
                    && prev.text != "なかっ"
                })
        },
    },
    GrammarRule {
        name: "ーだった",
        short: "past tense",
        tofugu: "https://www.tofugu.com/japanese-grammar/datta/",
        detect: |token, data| {
            token.base == "た" && token.text == "た" && data.prev_is(|prev| prev.text == "だっ")
        },
    },
    GrammarRule {
        name: "ーでした",
        short: "past tense",
        tofugu: "https://www.tofugu.com/japanese-grammar/deshita/",
        detect: |token, data| {
            token.base == "た"
                && token.text == "た"
                && data.prev_is(|prev| prev.text == "でし")
                // exclude ーませんでした
                && !(data.idx >= 3
                    && data.group[data.idx - 3].base == "ます"
                    && data.group[data.idx - 3].text == "ませ"
                    && data.group[data.idx - 2].text == "ん")
        },
    },
    GrammarRule {
        name: "ーませんでした",
        short: "did not do (polite)",
        tofugu: "https://www.tofugu.com/japanese-grammar/verb-negative-past-nakatta-form/",
        detect: |token, data| {
            data.idx >= 3
                && token.base == "た"
                && data.group[data.idx - 3].base == "ます"
                && data.group[data.idx - 3].text == "ませ"
                && data.group[data.idx - 2].text == "ん"
                && data.group[data.idx - 1].text == "でし"
        },
    },
    // also for i-adjective
    GrammarRule {
        name: "ーなかった",
        short: "negative past tense",
        tofugu: "https://www.tofugu.com/japanese-grammar/verb-negative-past-nakatta-form/",
        // may be なかっ「ない」 or なかっ「無い」
        detect: |token, data| {
            (token.base == "無い" || token.base == "ない")
                && token.text == "なかっ"
                && data.next_is(|next| next.base == "た")
                // exclude ーじゃなかった
                && !data.global_prev_is(|prev| prev.text == "じゃ" && prev.is_aux())
                // exclude ーではなかった which is ーではない + ーかった
                && !(data.idx >= 2
                    && data.group[data.idx - 2].text == "で"
                    && data.group[data.idx - 1].text == "は"
                    && data.group[data.idx - 1].is_particle())
        },
    },
    GrammarRule {
        name: "ーじゃなかった",
        short: "negative past tense",
        tofugu: "https://www.tofugu.com/japanese-grammar/janai-dewanai#past-tense",
        detect: |token, data| {
            token.base == "無い"
                && token.text == "なかっ"
                && data.global_prev_is(|prev| prev.text == "じゃ" && prev.is_aux())
                && data.next_is(|next| next.base == "た")
        },
    },
    // does not identify 形状詞 + ではなかった as those are across 3 global tokens
    // which is difficult to support for little gain
    GrammarRule {
        name: "ーではなかった",
        short: "negative past tense",
        tofugu: "https://www.tofugu.com/japanese-grammar/janai-dewanai#past-tense",
        detect: |token, data| {
            token.base == "無い"
                && token.text == "なかっ"
                && data.idx >= 2
                && data.group[data.idx - 2].text == "で"
                && data.group[data.idx - 1].text == "は"
                && data.group[data.idx - 1].is_particle()
                && data.next_is(|next| next.base == "た")
        },
    },
];
