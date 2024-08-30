use bincode::{Decode, Encode};
use serde::{Deserialize, Serialize};
use yomikiri_unidic_types::{
    UnidicAdjectivePos2, UnidicInterjectionPos2, UnidicNaAdjectivePos2, UnidicNounPos2,
    UnidicParticlePos2, UnidicPos, UnidicSuffixPos2, UnidicSymbolPos2, UnidicVerbPos2,
};

#[cfg(feature = "wasm")]
use tsify_next::Tsify;

#[cfg_attr(feature = "wasm", derive(Tsify))]
#[derive(Debug, Default, PartialEq, Eq, Serialize, Deserialize, Clone, Decode, Encode)]
pub struct Entry {
    pub forms: Vec<Form>,
    pub readings: Vec<Reading>,
    pub senses: Vec<Sense>,
    pub priority: u16,
}

impl Entry {
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
                return form.form.clone();
            }
        }
        for reading in &self.readings {
            if !reading.uncommon {
                return reading.reading.clone();
            }
        }
        if !self.forms.is_empty() {
            return self.forms[0].form.clone();
        }
        if !self.readings.is_empty() {
            return self.readings[0].reading.clone();
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

#[cfg_attr(feature = "wasm", derive(Tsify))]
#[derive(Debug, Default, PartialEq, Eq, Serialize, Deserialize, Clone, Decode, Encode)]
pub struct Form {
    pub form: String,
    pub info: Vec<String>,
    pub uncommon: bool,
}

#[cfg_attr(feature = "wasm", derive(Tsify))]
#[derive(Debug, Default, PartialEq, Eq, Serialize, Deserialize, Clone, Decode, Encode)]
#[serde(rename_all = "camelCase")]
pub struct Reading {
    pub reading: String,
    pub nokanji: bool,
    pub to_form: Vec<String>,
    pub info: Vec<String>,
    pub uncommon: bool,
}

#[cfg_attr(feature = "wasm", derive(Tsify))]
#[derive(Debug, Default, PartialEq, Eq, Serialize, Deserialize, Clone, Decode, Encode)]
#[serde(rename_all = "camelCase")]
pub struct Sense {
    pub to_form: Vec<String>,
    pub to_reading: Vec<String>,
    pub pos: Vec<PartOfSpeech>,
    pub misc: Vec<String>,
    pub info: Vec<String>,
    pub dialect: Vec<String>,
    pub meaning: Vec<String>,
}

/// Unidic based pos tagging
#[cfg_attr(feature = "wasm", derive(Tsify))]
#[derive(Debug, PartialEq, Eq, Serialize, Deserialize, Clone, Copy, Hash, Decode, Encode)]
#[serde(rename_all = "lowercase")]
pub enum PartOfSpeech {
    /// 名詞
    Noun,
    /// 動詞
    Verb,
    /// 形容詞
    Adjective,
    /// 形容動詞 / 形状詞 (unidic)
    #[serde(rename = "na-adjective")]
    NaAdjective,
    /// 助詞
    Particle,
    /// 副詞
    Adverb,
    /// 感動詞
    Interjection,
    /// 接尾辞
    Suffix,
    /// 助動詞
    #[serde(rename = "auxiliary verb")]
    AuxiliaryVerb,
    /// 代名詞
    Pronoun,
    /// 接続詞
    Conjunction,
    /// 接頭辞
    Prefix,
    /// 連体詞
    Adnomial,
    Expression,
    Unclassified,
    /// Represents symbol pos from unidic
    Symbol,
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
            PartOfSpeech::Symbol => UnidicPos::Symbol(UnidicSymbolPos2::Unknown),
        }
    }
}

impl From<UnidicPos> for PartOfSpeech {
    fn from(value: UnidicPos) -> Self {
        match value {
            UnidicPos::Noun(_) => PartOfSpeech::Noun,
            UnidicPos::Verb(_) => PartOfSpeech::Verb,
            UnidicPos::Adjective(_) => PartOfSpeech::Adjective,
            UnidicPos::NaAdjective(_) => PartOfSpeech::NaAdjective,
            UnidicPos::Particle(_) => PartOfSpeech::Particle,
            UnidicPos::Adverb => PartOfSpeech::Adverb,
            UnidicPos::Interjection(_) => PartOfSpeech::Interjection,
            UnidicPos::Suffix(_) => PartOfSpeech::Suffix,
            UnidicPos::AuxVerb => PartOfSpeech::AuxiliaryVerb,
            UnidicPos::Pronoun => PartOfSpeech::Pronoun,
            UnidicPos::Conjunction => PartOfSpeech::Conjunction,
            UnidicPos::Prefix => PartOfSpeech::Prefix,
            UnidicPos::PrenounAdjectival => PartOfSpeech::Adnomial,
            UnidicPos::Expression => PartOfSpeech::Expression,
            UnidicPos::SupplementarySymbol(_) => PartOfSpeech::Symbol,
            UnidicPos::Whitespace => PartOfSpeech::Symbol,
            UnidicPos::Symbol(_) => PartOfSpeech::Symbol,
            UnidicPos::Unknown => PartOfSpeech::Unclassified,
        }
    }
}
