use std::borrow::Cow;

use bincode::Decode;
use serde::{Deserialize, Serialize};
use yomikiri_unidic_types::{
    UnidicAdjectivePos2, UnidicInterjectionPos2, UnidicNaAdjectivePos2, UnidicNounPos2,
    UnidicParticlePos2, UnidicPos, UnidicSuffixPos2, UnidicVerbPos2,
};

#[derive(Debug, Default, PartialEq, Eq, Serialize, Deserialize, Clone, Decode)]
pub struct Entry<'a> {
    #[serde(rename = "f", default, skip_serializing_if = "Vec::is_empty")]
    pub forms: Vec<Form<'a>>,
    #[serde(rename = "r")]
    pub readings: Vec<Reading<'a>>,
    #[serde(rename = "s")]
    pub senses: Vec<Sense<'a>>,
    #[serde(rename = "p", default, skip_serializing_if = "is_zero")]
    pub priority: u16,
}

impl<'a> Entry<'a> {
    pub fn terms(&self) -> Vec<&str> {
        let mut terms: Vec<&str> = vec![];
        for form in &self.forms {
            terms.push(&form.form);
        }
        for reading in &self.readings {
            terms.push(&reading.reading);
        }
        terms
    }

    pub fn is_expression(&self) -> bool {
        self.senses
            .iter()
            .any(|s| s.pos.iter().any(|p| *p == PartOfSpeech::Expression))
    }

    pub fn is_noun(&self) -> bool {
        self.senses
            .iter()
            .any(|s| s.pos.iter().any(|p| *p == PartOfSpeech::Noun))
    }

    pub fn is_particle(&self) -> bool {
        self.senses
            .iter()
            .any(|s| s.pos.iter().any(|p| *p == PartOfSpeech::Particle))
    }

    pub fn is_conjunction(&self) -> bool {
        self.senses
            .iter()
            .any(|s| s.pos.iter().any(|p| *p == PartOfSpeech::Conjunction))
    }

    pub fn is_verb(&self) -> bool {
        self.senses
            .iter()
            .any(|s| s.pos.iter().any(|p| *p == PartOfSpeech::Verb))
    }

    pub fn main_form(&self) -> String {
        for form in &self.forms {
            if !form.uncommon {
                return form.form.clone().into_owned();
            }
        }
        for reading in &self.readings {
            if !reading.uncommon {
                return reading.reading.clone().into_owned();
            }
        }
        if !self.forms.is_empty() {
            return self.forms[0].form.clone().into_owned();
        }
        if !self.readings.is_empty() {
            return self.readings[0].reading.clone().into_owned();
        }

        "".into()
    }

    pub fn reading_for_form(&self, form: &str) -> Option<&Reading> {
        self.readings.iter().find(|reading| {
            (reading.to_form.is_empty() || reading.to_form.iter().any(|f| f == form))
                && !reading.nokanji
        })
    }
}

#[derive(Debug, Default, PartialEq, Eq, Serialize, Deserialize, Clone, Decode)]
pub struct Form<'a> {
    #[serde(rename = "f")]
    pub form: Cow<'a, str>,
    #[serde(rename = "i", default, skip_serializing_if = "Vec::is_empty")]
    pub info: Vec<Cow<'a, str>>,
    #[serde(rename = "u", default, skip_serializing_if = "is_false")]
    pub uncommon: bool,
}

#[derive(Debug, Default, PartialEq, Eq, Serialize, Deserialize, Clone, Decode)]
pub struct Reading<'a> {
    #[serde(rename = "r")]
    pub reading: Cow<'a, str>,
    #[serde(rename = "nk", default, skip_serializing_if = "is_false")]
    pub nokanji: bool,
    #[serde(rename = "tf", default, skip_serializing_if = "Vec::is_empty")]
    pub to_form: Vec<Cow<'a, str>>,
    #[serde(rename = "i", default, skip_serializing_if = "Vec::is_empty")]
    pub info: Vec<Cow<'a, str>>,
    #[serde(rename = "u", default, skip_serializing_if = "is_false")]
    pub uncommon: bool,
}

#[derive(Debug, Default, PartialEq, Eq, Serialize, Deserialize, Clone, Decode)]
pub struct Sense<'a> {
    #[serde(rename = "tf", default, skip_serializing_if = "Vec::is_empty")]
    pub to_form: Vec<Cow<'a, str>>,
    #[serde(rename = "tr", default, skip_serializing_if = "Vec::is_empty")]
    pub to_reading: Vec<Cow<'a, str>>,
    #[serde(rename = "p", default, skip_serializing_if = "Vec::is_empty")]
    pub pos: Vec<PartOfSpeech>,
    #[serde(rename = "mc", default, skip_serializing_if = "Vec::is_empty")]
    pub misc: Vec<Cow<'a, str>>,
    #[serde(rename = "i", default, skip_serializing_if = "Vec::is_empty")]
    pub info: Vec<Cow<'a, str>>,
    #[serde(rename = "d", default, skip_serializing_if = "Vec::is_empty")]
    pub dialect: Vec<Cow<'a, str>>,
    #[serde(rename = "m", default, skip_serializing_if = "Vec::is_empty")]
    pub meaning: Vec<Cow<'a, str>>,
}

/// Unidic based pos tagging
#[derive(Debug, PartialEq, Eq, Serialize, Deserialize, Clone, Copy, Hash, Decode)]
pub enum PartOfSpeech {
    /// 名詞
    #[serde(rename = "n")]
    Noun,
    /// 動詞
    #[serde(rename = "v")]
    Verb,
    /// 形容詞
    #[serde(rename = "a")]
    Adjective,
    /// 形容動詞 / 形状詞 (unidic)
    #[serde(rename = "na")]
    NaAdjective,
    /// 助詞
    #[serde(rename = "p")]
    Particle,
    /// 副詞
    #[serde(rename = "av")]
    Adverb,
    /// 感動詞
    #[serde(rename = "i")]
    Interjection,
    /// 接尾辞
    #[serde(rename = "sf")]
    Suffix,
    /// 助動詞
    #[serde(rename = "ax")]
    AuxiliaryVerb,
    /// 代名詞
    #[serde(rename = "pn")]
    Pronoun,
    /// 接続詞
    #[serde(rename = "c")]
    Conjunction,
    /// 接頭辞
    #[serde(rename = "pf")]
    Prefix,
    /// 連体詞
    #[serde(rename = "ad")]
    Adnomial,
    #[serde(rename = "e")]
    Expression,
    #[serde(rename = "u")]
    Unclassified,
}

fn is_false(a: &bool) -> bool {
    !*a
}

fn is_zero(a: &u16) -> bool {
    *a == 0
}

impl PartOfSpeech {
    pub fn to_unidic(&self) -> UnidicPos {
        match &self {
            PartOfSpeech::Noun => UnidicPos::Noun(UnidicNounPos2::Unknown),
            PartOfSpeech::Verb => UnidicPos::Verb(UnidicVerbPos2::Unknown),
            PartOfSpeech::Adjective => UnidicPos::Adjective(UnidicAdjectivePos2::Unknown),
            PartOfSpeech::NaAdjective => UnidicPos::NaAdjective(UnidicNaAdjectivePos2::Unknown),
            PartOfSpeech::Particle => UnidicPos::Particle(UnidicParticlePos2::Unknown),
            PartOfSpeech::Adverb => UnidicPos::Adverb,
            PartOfSpeech::Interjection => UnidicPos::Interjection(UnidicInterjectionPos2::Unknown),
            PartOfSpeech::Suffix => UnidicPos::Suffix(UnidicSuffixPos2::Unknown),
            PartOfSpeech::AuxiliaryVerb => UnidicPos::AuxVerb,
            PartOfSpeech::Pronoun => UnidicPos::Pronoun,
            PartOfSpeech::Conjunction => UnidicPos::Conjunction,
            PartOfSpeech::Prefix => UnidicPos::Prefix,
            PartOfSpeech::Adnomial => UnidicPos::PrenounAdjectival,
            PartOfSpeech::Expression => UnidicPos::Expression,
            PartOfSpeech::Unclassified => UnidicPos::Unknown,
        }
    }
}
