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
    非自立可能,
    一般,
}

pub enum UnidicNaAdjectivePos2 {
    助動詞語幹,
    一般,
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

/*

impl UnidicPos {
    pub fn from_unidic(pos: &str) -> Result<Self> {
        Ok(match pos {
            "名詞" => UnidicPos::Noun,
            "助詞" => UnidicPos::Particle,
            "動詞" => UnidicPos::Verb,
            "形容詞" => UnidicPos::Adjective,
            "形状詞" => UnidicPos::NaAdjective,
            "感動詞" => UnidicPos::Interjection,
            "接尾辞" => UnidicPos::Suffix,
            "助動詞" => UnidicPos::AuxVerb,
            "空白" => UnidicPos::Whitespace,
            "代名詞" => UnidicPos::Pronoun,
            "記号" => UnidicPos::Symbol,
            "補助記号" => UnidicPos::SupplementarySymbol,
            "接続詞" => UnidicPos::Conjunction,
            "接頭辞" => UnidicPos::Prefix,
            "連体詞" => UnidicPos::PrenounAdjectival,
            "副詞" => UnidicPos::Adverb,
            other => return Err(UnknownValueError::new(other)),
        })
    }
}
*/
