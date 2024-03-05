#[derive(Debug)]
pub struct UnknownValueError {
    pub encountered: String,
}

impl UnknownValueError {
    pub fn new<S: Into<String>>(value: S) -> Self {
        UnknownValueError {
            encountered: value.into(),
        }
    }
}

type Result<T> = std::result::Result<T, UnknownValueError>;

pub enum UnidicPos {
    Noun(UnidicNounPos2),
    Particle(UnidicParticlePos2),
    Verb(UnidicVerbPos2),
    Adjective(UnidicAdjectivePos2),
    NaAdjective(UnidicNaAdjectivePos2),
    Interjection(UnidicInterjectionPos2),
    Suffix(UnidicSuffixPos2),
    AuxVerb,
    Whitespace,
    Pronoun,
    Symbol(UnidicSymbolPos2),
    SupplementarySymbol(UnidicSupplementarySymbolPos2),
    /// e.g. しかし
    Conjunction,
    Prefix,
    PrenounAdjectival,
    Adverb,
}

pub enum UnidicNounPos2 {
    助動詞語幹,
    固有名詞,
    普通名詞,
    数詞,
}

pub enum UnidicParticlePos2 {
    係助詞,
    格助詞,
    /// conjunctive particle
    接続助詞,
    準体助詞,
    終助詞,
    副助詞,
}

pub enum UnidicVerbPos2 {
    一般,
    非自立可能,
}

pub enum UnidicAdjectivePos2 {
    一般,
    非自立可能,
}

pub enum UnidicNaAdjectivePos2 {
    一般,
    助動詞語幹,
    タリ,
}

pub enum UnidicInterjectionPos2 {
    一般,
    フィラー,
}

pub enum UnidicSuffixPos2 {
    名詞的,
    形容詞的,
    動詞的,
    形状詞的,
}

pub enum UnidicSymbolPos2 {
    一般,
    文字,
}

pub enum UnidicSupplementarySymbolPos2 {
    読点,
    一般,
    括弧開,
    括弧閉,
    /// actual is 'ＡＡ', not 'AA'
    AA,
    句点,
}

impl UnidicPos {
    pub fn from_unidic(pos: &str, pos2: &str) -> Result<Self> {
        Ok(match pos {
            "名詞" => UnidicPos::Noun(UnidicNounPos2::from_unidic(pos2)?),
            "助詞" => UnidicPos::Particle(UnidicParticlePos2::from_unidic(pos2)?),
            "動詞" => UnidicPos::Verb(UnidicVerbPos2::from_unidic(pos2)?),
            "形容詞" => UnidicPos::Adjective(UnidicAdjectivePos2::from_unidic(pos2)?),
            "形状詞" => UnidicPos::NaAdjective(UnidicNaAdjectivePos2::from_unidic(pos2)?),
            "感動詞" => UnidicPos::Interjection(UnidicInterjectionPos2::from_unidic(pos2)?),
            "接尾辞" => UnidicPos::Suffix(UnidicSuffixPos2::from_unidic(pos2)?),
            "助動詞" => UnidicPos::AuxVerb,
            "空白" => UnidicPos::Whitespace,
            "代名詞" => UnidicPos::Pronoun,
            "記号" => UnidicPos::Symbol(UnidicSymbolPos2::from_unidic(pos2)?),
            "補助記号" => {
                UnidicPos::SupplementarySymbol(UnidicSupplementarySymbolPos2::from_unidic(pos2)?)
            }
            "接続詞" => UnidicPos::Conjunction,
            "接頭辞" => UnidicPos::Prefix,
            "連体詞" => UnidicPos::PrenounAdjectival,
            "副詞" => UnidicPos::Adverb,
            other => return Err(UnknownValueError::new(other)),
        })
    }
}

impl UnidicNounPos2 {
    pub fn from_unidic(pos2: &str) -> Result<Self> {
        Ok(match pos2 {
            "助動詞語幹" => UnidicNounPos2::助動詞語幹,
            "固有名詞" => UnidicNounPos2::固有名詞,
            "普通名詞" => UnidicNounPos2::普通名詞,
            "数詞" => UnidicNounPos2::数詞,
            other => return Err(UnknownValueError::new(other)),
        })
    }
}

impl UnidicParticlePos2 {
    pub fn from_unidic(pos2: &str) -> Result<Self> {
        Ok(match pos2 {
            "係助詞" => UnidicParticlePos2::係助詞,
            "格助詞" => UnidicParticlePos2::格助詞,
            "接続助詞" => UnidicParticlePos2::接続助詞,
            "準体助詞" => UnidicParticlePos2::準体助詞,
            "終助詞" => UnidicParticlePos2::終助詞,
            "副助詞" => UnidicParticlePos2::副助詞,
            other => return Err(UnknownValueError::new(other)),
        })
    }
}

impl UnidicVerbPos2 {
    pub fn from_unidic(pos2: &str) -> Result<Self> {
        Ok(match pos2 {
            "一般" => UnidicVerbPos2::一般,
            "非自立可能" => UnidicVerbPos2::非自立可能,
            other => return Err(UnknownValueError::new(other)),
        })
    }
}

impl UnidicAdjectivePos2 {
    pub fn from_unidic(pos2: &str) -> Result<Self> {
        Ok(match pos2 {
            "一般" => UnidicAdjectivePos2::一般,
            "非自立可能" => UnidicAdjectivePos2::非自立可能,
            other => return Err(UnknownValueError::new(other)),
        })
    }
}

impl UnidicNaAdjectivePos2 {
    pub fn from_unidic(pos2: &str) -> Result<Self> {
        Ok(match pos2 {
            "一般" => UnidicNaAdjectivePos2::一般,
            "助動詞語幹" => UnidicNaAdjectivePos2::助動詞語幹,
            "タリ" => UnidicNaAdjectivePos2::タリ,
            other => return Err(UnknownValueError::new(other)),
        })
    }
}

impl UnidicInterjectionPos2 {
    pub fn from_unidic(pos2: &str) -> Result<Self> {
        Ok(match pos2 {
            "一般" => UnidicInterjectionPos2::一般,
            "フィラー" => UnidicInterjectionPos2::フィラー,
            other => return Err(UnknownValueError::new(other)),
        })
    }
}

impl UnidicSuffixPos2 {
    pub fn from_unidic(pos2: &str) -> Result<Self> {
        Ok(match pos2 {
            "名詞的" => UnidicSuffixPos2::名詞的,
            "形容詞的" => UnidicSuffixPos2::形容詞的,
            "動詞的" => UnidicSuffixPos2::動詞的,
            "形状詞的" => UnidicSuffixPos2::形状詞的,
            other => return Err(UnknownValueError::new(other)),
        })
    }
}

impl UnidicSymbolPos2 {
    pub fn from_unidic(pos2: &str) -> Result<Self> {
        Ok(match pos2 {
            "一般" => UnidicSymbolPos2::一般,
            "文字" => UnidicSymbolPos2::文字,
            other => return Err(UnknownValueError::new(other)),
        })
    }
}

impl UnidicSupplementarySymbolPos2 {
    pub fn from_unidic(pos2: &str) -> Result<Self> {
        Ok(match pos2 {
            "読点" => UnidicSupplementarySymbolPos2::読点,
            "一般" => UnidicSupplementarySymbolPos2::一般,
            "括弧開" => UnidicSupplementarySymbolPos2::括弧開,
            "括弧閉" => UnidicSupplementarySymbolPos2::括弧閉,
            "ＡＡ" => UnidicSupplementarySymbolPos2::AA,
            "句点" => UnidicSupplementarySymbolPos2::句点,
            other => return Err(UnknownValueError::new(other)),
        })
    }
}
