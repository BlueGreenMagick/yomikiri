use serde::{Deserialize, Serialize};

use crate::utils::jm_entity_enum;

#[derive(Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct JMDict {
    pub entries: Vec<JMEntry>,
    pub creation_date: Option<String>,
}

#[derive(Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct JMEntry {
    pub id: u32,
    /// 0+ k_ele
    pub kanjis: Vec<JMKanji>,
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
pub struct JMKanji {
    pub kanji: String,
    /// 0+ ke_inf
    pub info: Vec<JMKanjiInfo>,
    /// 0+ ke_pri
    pub priority: Vec<String>,
}

impl JMKanji {
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
    pub pos: Vec<JMPartOfSpeech>,
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
    pub dialects: Vec<JMDialect>,
    /// 'gloss'
    pub meanings: Vec<String>,
    // 'example'
    // example: Vec<Example>,
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
    b"ateji" => AtejiReading,
    b"ik" => IrregularKana,
    b"iK" => IrregularKanji,
    b"io" => IrregularOkurigana,
    b"oK" => OutdatedKanji,
    b"rK" => RareKanjiForm,
    b"sK" => SearchOnlyKanji,
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
    b"given" => Forename,
    b"group" => Group,
    b"hist" => HistoricalTerm,
    b"hon" => Honorific,
    b"hum" => Humble,
    b"id" => Idiomatic,
    b"joc" => Jocular,
    b"leg" => Legend,
    b"m-sl" => MangaSlang,
    b"male" => Male,
    b"myth" => Mythology,
    b"net-sl" => InternetSlang,
    b"obj" => Object,
    b"obs" => Obsolete,
    b"on-mim" => Onomatopoeic,
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
    b"station" => Railway,
    b"surname" => Surname,
    b"uk" => UsuallyKanaAlone,
    b"unclass" => Unclassified,
    b"vulg" => Vulgar,
    b"work" => Artwork,
    b"X" => RudeTerm,
    b"yoji" => Yojijukugo,
);

jm_entity_enum!(
    JMPartOfSpeech;
    #[doc="noun or verb acting prenominally"]
    b"adj-f" => PrenominalNounOrVerb,
    #[doc="adjective (keiyoushi)"]
    b"adj-i" => Adjective,
    #[doc="adjective (keiyoushi) - yoi/ii class"]
    b"adj-ix" => AdjectiveYoiOrIi,
    #[doc="'kari' adjective (archaic)"]
    b"adj-kari" => AdjectiveKari,
    #[doc="'ku' adjective (archaic)"]
    b"adj-ku" => AdjectiveKu,
    #[doc="adjectival nouns or quasi-adjectives (keiyodoshi)"]
    b"adj-na" => NaAdjectivalNoun,
    #[doc="archaic/formal form of na-adjective"]
    b"adj-nari" => NaAdjectiveNari,
    #[doc="nouns which may take the genitive case particle 'no'"]
    b"adj-no" => NounNo,
    #[doc="pre-noun adjectival (rentaishi)"]
    b"adj-pn" => PrenounAdjectival,
    #[doc="'shiku' adjective (archaic)"]
    b"adj-shiku" => AdjectiveShiku,
    #[doc="'taru' adjective"]
    b"adj-t" => AdjectiveTaru,
    #[doc="adverb (fukushi)"]
    b"adv" => Adverb,
    #[doc="adverb taking the 'to' particle"]
    b"adv-to" => AdverbTo,
    #[doc="auxiliary"]
    b"aux" => Auxiliary,
    #[doc="auxiliary adjective"]
    b"aux-adj" => AuxiliaryAdjective,
    #[doc="auxiliary verb"]
    b"aux-v" => AuxiliaryVerb,
    #[doc="conjunction"]
    b"conj" => Conjunction,
    #[doc="copula"]
    b"cop" => Copula,
    #[doc="counter"]
    b"ctr" => Counter,
    #[doc="expressions (phrases, clauses, etc.)"]
    b"exp" => Expression,
    #[doc="interjection (kandoushi)"]
    b"int" => Interjection,
    #[doc="noun (common) (futsuumeishi)"]
    b"n" => Noun,
    #[doc="adverbial noun (fukushitekimeishi)"]
    b"n-adv" => AdverbialNoun,
    #[doc="proper noun"]
    b"n-pr" => ProperNoun,
    #[doc="noun, used as a prefix"]
    b"n-pref" => PrefixNoun,
    #[doc="noun, used as a suffix"]
    b"n-suf" => SuffixNoun,
    #[doc="noun (temporal) (jisoumeishi)"]
    b"n-t" => TemporalNoun,
    #[doc="numeric"]
    b"num" => Numeric,
    #[doc="pronoun"]
    b"pn" => Pronoun,
    #[doc="prefix"]
    b"pref" => Prefix,
    #[doc="particle"]
    b"prt" => Particle,
    #[doc="suffix"]
    b"suf" => Suffix,
    #[doc="unclassified"]
    b"unc" => Unclassified,
    #[doc="verb unspecified"]
    b"v-unspec" => UnspecifiedVerb,
    #[doc="Ichidan verb"]
    b"v1" => VerbIchidan,
    #[doc="Ichidan verb - kureru special class"]
    b"v1-s" => VerbIchidanKureru,
    #[doc="Nidan verb with 'u' ending (archaic)"]
    b"v2a-s" => VerbNidanU,
    #[doc="Nidan verb (upper class) with 'bu' ending (archaic)"]
    b"v2b-k" => VerbNidanBK,
    #[doc="Nidan verb (lower class) with 'bu' ending (archaic)"]
    b"v2b-s" => VerbNidanBS,
    #[doc="Nidan verb (upper class) with 'dzu' ending (archaic)"]
    b"v2d-k" => VerbNidanDK,
    #[doc="Nidan verb (lower class) with 'dzu' ending (archaic)"]
    b"v2d-s" => VerbNidanDS,
    #[doc="Nidan verb (upper class) with 'gu' ending (archaic)"]
    b"v2g-k" => VerbNidanGK,
    #[doc="Nidan verb (lower class) with 'gu' ending (archaic)"]
    b"v2g-s" => VerbNidanGS,
    #[doc="Nidan verb (upper class) with 'hu/fu' ending (archaic)"]
    b"v2h-k" => VerbNidanHK,
    #[doc="Nidan verb (lower class) with 'hu/fu' ending (archaic)"]
    b"v2h-s" => VerbNidanHS,
    #[doc="Nidan verb (upper class) with 'ku' ending (archaic)"]
    b"v2k-k" => VerbNidanKK,
    #[doc="Nidan verb (lower class) with 'ku' ending (archaic)"]
    b"v2k-s" => VerbNidanKS,
    #[doc="Nidan verb (upper class) with 'mu' ending (archaic)"]
    b"v2m-k" => VerbNidanMK,
    #[doc="Nidan verb (lower class) with 'mu' ending (archaic)"]
    b"v2m-s" => VerbNidanMS,
    #[doc="Nidan verb (lower class) with 'nu' ending (archaic)"]
    b"v2n-s" => VerbNidanNS,
    #[doc="Nidan verb (upper class) with 'ru' ending (archaic)"]
    b"v2r-k" => VerbNidanRK,
    #[doc="Nidan verb (lower class) with 'ru' ending (archaic)"]
    b"v2r-s" => VerbNidanRS,
    #[doc="Nidan verb (lower class) with 'su' ending (archaic)"]
    b"v2s-s" => VerbNidanSS,
    #[doc="Nidan verb (upper class) with 'tsu' ending (archaic)"]
    b"v2t-k" => VerbNidanTK,
    #[doc="Nidan verb (lower class) with 'tsu' ending (archaic)"]
    b"v2t-s" => VerbNidanTS,
    #[doc="Nidan verb (lower class) with 'u' ending and 'we' conjugation (archaic)"]
    b"v2w-s" => VerbNidanWS,
    #[doc="Nidan verb (upper class) with 'yu' ending (archaic)"]
    b"v2y-k" => VerbNidanYK,
    #[doc="Nidan verb (lower class) with 'yu' ending (archaic)"]
    b"v2y-s" => VerbNidanYS,
    #[doc="Nidan verb (lower class) with 'zu' ending (archaic)"]
    b"v2z-s" => VerbNidanZS,
    #[doc="Yodan verb with 'bu' ending (archaic)"]
    b"v4b" => VerbYodanB,
    #[doc="Yodan verb with 'gu' ending (archaic)"]
    b"v4g" => VerbYodanG,
    #[doc="Yodan verb with 'hu/fu' ending (archaic)"]
    b"v4h" => VerbYodanH,
    #[doc="Yodan verb with 'ku' ending (archaic)"]
    b"v4k" => VerbYodanK,
    #[doc="Yodan verb with 'mu' ending (archaic)"]
    b"v4m" => VerbYodanM,
    #[doc="Yodan verb with 'nu' ending (archaic)"]
    b"v4n" => VerbYodanN,
    #[doc="Yodan verb with 'ru' ending (archaic)"]
    b"v4r" => VerbYodanR,
    #[doc="Yodan verb with 'su' ending (archaic)"]
    b"v4s" => VerbYodanS,
    #[doc="Yodan verb with 'tsu' ending (archaic)"]
    b"v4t" => VerbYodanT,
    #[doc="Godan verb - -aru special class"]
    b"v5aru" => VerbGodanAru,
    #[doc="Godan verb with 'bu' ending"]
    b"v5b" => VerbGodanB,
    #[doc="Godan verb with 'gu' ending"]
    b"v5g" => VerbGodanG,
    #[doc="Godan verb with 'ku' ending"]
    b"v5k" => VerbGodanK,
    #[doc="Godan verb - Iku/Yuku special class"]
    b"v5k-s" => VerbGodanKS,
    #[doc="Godan verb with 'mu' ending"]
    b"v5m" => VerbGodanM,
    #[doc="Godan verb with 'nu' ending"]
    b"v5n" => VerbGodanN,
    #[doc="Godan verb with 'ru' ending"]
    b"v5r" => VerbGodanR,
    #[doc="Godan verb with 'ru' ending (irregular verb)"]
    b"v5r-i" => VerbGodanRI,
    #[doc="Godan verb with 'su' ending"]
    b"v5s" => VerbGodanS,
    #[doc="Godan verb with 'tsu' ending"]
    b"v5t" => VerbGodanT,
    #[doc="Godan verb with 'u' ending"]
    b"v5u" => VerbGodanU,
    #[doc="Godan verb with 'u' ending (special class)"]
    b"v5u-s" => VerbGodanUS,
    #[doc="Godan verb - Uru old class verb (old form of Eru)"]
    b"v5uru" => VerbGodanUru,
    #[doc="intransitive verb"]
    b"vi" => VerbIntransitive,
    #[doc="Kuru verb - special class"]
    b"vk" => VerbKuru,
    #[doc="irregular nu verb"]
    b"vn" => VerbNu,
    #[doc="irregular ru verb, plain form ends with -ri"]
    b"vr" => VerbRu,
    #[doc="noun or participle which takes the aux. verb suru"]
    b"vs" => VerbSuru,
    #[doc="su verb - precursor to the modern suru"]
    b"vs-c" => VerbSu,
    #[doc="suru verb - included"]
    b"vs-i" => VerbSuruIncluded,
    #[doc="suru verb - special class"]
    b"vs-s" => VerbSuruSpecial,
    #[doc="transitive verb"]
    b"vt" => VerbTransitive,
    #[doc="Ichidan verb - zuru verb (alternative form of -jiru verbs)"]
    b"vz" => VerbIchidanZ,
);

jm_entity_enum!(
    JMReadingInfo;
    b"gikun" => Gikun,
    b"ik" => Irregular,
    b"ok" => Outdated,
    b"rk" => Rare,
    b"sk" => SearchOnly,
);
