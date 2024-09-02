use serde::{Deserialize, Serialize};

use crate::utils::jm_entity_enum;

#[derive(Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct JMDict {
    pub entries: Vec<JMEntry>,
}

#[derive(Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct JMEntry {
    pub id: u32,
    /// 0+ k_ele
    pub forms: Vec<JMForm>,
    /// 1+ r_ele
    pub readings: Vec<JMReading>,
    /// 1+ sense
    pub senses: Vec<JMSense>,
}

impl JMEntry {
    pub fn priority(&self) -> u16 {
        let priorities = &self.readings.first().unwrap().priority;
        let mut priority: u16 = 0;

        for p in priorities {
            // common ~20k entries
            if ["news1", "ichi1", "spec1", "gai1"].contains(&p.as_str()) {
                if priority < 100 {
                    priority += 100
                } else {
                    priority += 25
                }
            // common ~30k entries
            } else if ["news2", "ichi2", "spec2", "gai2"].contains(&p.as_str()) {
                priority += 5
            // 01 ~ 48, each with ~500 entries
            } else if let Some(stripped) = p.strip_prefix("nf") {
                let freq = stripped
                    .parse::<u16>()
                    .expect("could not parse XX as number where priority nfXX");
                priority += 50 - freq;
            }
        }
        priority
    }
}

#[derive(Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct JMForm {
    pub form: String,
    /// 0+ ke_inf
    pub info: Vec<JMKanjiInfo>,
    /// 0+ ke_pri
    pub priority: Vec<String>,
}

impl JMForm {
    pub fn is_uncommon(&self) -> bool {
        self.info.iter().any(|s| {
            *s == JMKanjiInfo::OutdatedKanji
                || *s == JMKanjiInfo::RareKanjiForm
                || *s == JMKanjiInfo::SearchOnlyKanji
        })
    }
}

#[derive(Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct JMReading {
    pub reading: String,
    pub nokanji: bool,
    /// 0+ re_restr
    pub to_form: Vec<String>,
    /// 0+ re_inf
    pub info: Vec<JMReadingInfo>,
    /// 0+ re_pri
    pub priority: Vec<String>,
}

impl JMReading {
    pub fn is_uncommon(&self) -> bool {
        self.info
            .iter()
            .any(|s| *s == JMReadingInfo::Outdated || *s == JMReadingInfo::SearchOnly)
    }
}

#[derive(Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct JMSense {
    /// 0+ 'stagk'
    pub to_form: Vec<String>,
    /// 0+ 'stagr'
    pub to_reading: Vec<String>,
    /// 'pos'
    pub part_of_speech: Vec<JMPartOfSpeech>,
    /// 'xref'
    // pub reference: Vec<String>,
    /// 'ant'
    // pub antonym: Vec<String>,
    /// 'field'
    // pub field: Vec<String>,
    /// 'misc'
    pub misc: Vec<JMSenseMisc>,
    /// 's_inf'
    pub info: Vec<String>,
    /// 'dial'
    pub dialect: Vec<JMDialect>,
    /// 'gloss'
    pub meaning: Vec<String>,
    // 'example'
    // example: Vec<Example>,
}

/// returns true if
fn is_single_entity(text: &[u8]) -> bool {
    if text.len() > 2 && text[0] == b'&' && text[text.len() - 1] == b';' {
        let inner = &text[1..text.len() - 1];
        if !inner.contains(&b';') {
            return true;
        }
    }
    return false;
}

jm_entity_enum!(
    JMDialect;
    b"hob" => HokkaidoBen,
    b"bra" => Brazilian,
    b"ksb" => KansaiBen,
    b"ktb" => KantouBen,
    b"kyb" => KyotoBen,
    b"kyu" => KyuushuuBen,
    b"nab" => NaganoBen,
    b"osb" => OsakaBen,
    b"rkb" => RyuukyuuBen,
    b"thb" => TouhokuBen,
    b"tsb" => TosaBen,
    b"tsug" => TsugaruBen,
);

jm_entity_enum!(
    JMKanjiInfo;
    b"bateji" => AtejiReading,
    b"bik" => IrregularKana,
    b"biK" => IrregularKanji,
    b"bio" => IrregularOkurigana,
    b"boK" => OutdatedKanji,
    b"brK" => RareKanjiForm,
    b"bsK" => SearchOnlyKanji,
);

jm_entity_enum!(
    JMSenseMisc;
    b"abbr" => Abbreviation,
    b"arch" => Archaic,
    b"char" => Character,
    b"chn" => Children,
    b"col" => Colloquial,
    b"company" => Company,
    b"creat" => Creature,
    b"dated" => DatedTerm,
    b"dei" => Deity,
    b"derog" => Derogatory,
    b"doc" => Document,
    b"euph" => Euphemistic,
    b"ev" => Event,
    b"fam" => Familiar,
    b"fem" => Female,
    b"fict" => Fiction,
    b"form" => FormalTerm,
    b"given" => GivenForename,
    b"group" => Group,
    b"hist" => HistoricalTerm,
    b"hon" => Honorific,
    b"hum" => Humble,
    b"id" => Idiomatic,
    b"joc" => Jocular,
    b"leg" => Legend,
    b"male" => Male,
    b"myth" => Mythology,
    b"obj" => Object,
    b"obs" => Obsolete,
    b"organization" => Organization,
    b"oth" => Other,
    b"person" => Person,
    b"place" => Place,
    b"poet" => Poetical,
    b"pol" => Polite,
    b"product" => Product,
    b"proverb" => Proverb,
    b"quote" => Quotation,
    b"rare" => Rare,
    b"relig" => Religion,
    b"sens" => Sensitive,
    b"serv" => Service,
    b"ship" => Ship,
    b"sl" => Slang,
    b"station" => RailwayStation,
    b"surname" => Surname,
    b"uk" => UsuallyKanaAlone,
    b"unclass" => Unclassified,
    b"vulg" => Vulgar,
    b"work" => WorkOfArt,
    b"X" => RudeTerm,
    b"yoji" => Yojijukugo,
);

jm_entity_enum!(
    JMPartOfSpeech;
    #[doc = "副詞"]
    b"adv" | b"adv-to" | b"vs-c" | b"vs-i" => Adverb,
    #[doc = "接続詞"]
    b"conj" => Conjunction,
    #[doc = "感動詞"]
    b"int" => Interjection,
    #[doc = "接尾辞"]
    b"suf" | b"n-suf" | b"ctr" => Suffix,
    #[doc = "助詞"]
    b"prt" => Particle,
    #[serde(rename = "na-adjective")]
    #[doc = "形容動詞"]
    b"adj-na" | b"adj-t" | b"adj-nari" => NaAdjective,
    #[serde(rename = "auxiliary verb")]
    #[doc = "助動詞"]
    b"aux-v" | b"aux" | b"aux-adj" | b"cop" => AuxiliaryVerb,
    #[doc = "代名詞"]
    b"pn" => Pronoun,
    #[doc = "接頭辞"]
    b"pref" => Prefix,
    #[doc = "連体詞"]
    b"adj-pn" => Adnomial,
    b"exp" => Expression,
    b"unc" => Unclassified,
    #[doc = "名詞"]
    b"n" | b"adj-no" | b"adj-f" | b"num" | b"vs" | [b'n', b'-', ..] => Noun,
    #[doc = "動詞"]
    [b'v', ..] => Verb,
    #[doc = "形容詞"]
    b"adj-i" | b"adj-ix"  | [b'a', b'd', b'j', b'-', ..] => Adjective,
    /// Represents symbol pos from unidic
    => Symbol,
);

jm_entity_enum!(
    JMReadingInfo;
    b"gikun" => Gikun,
    b"ik" => Irregular,
    b"ok" => Outdated,
    b"rk" => Rare,
    b"sk" => SearchOnly,
);
