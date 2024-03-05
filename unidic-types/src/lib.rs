#![allow(uncommon_codepoints)]

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

/// valid num: 0 - 61
#[inline(always)]
fn short_value(num: usize) -> u8 {
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".as_bytes()[num]
}

macro_rules! unidic_pos_enum {
    ($( $pos_name:ident $($pos2_name:ident)? ),+) => {
        pub enum UnidicPos {
            $(
                $pos_name $( ($pos2_name) )?,
            )+

        }
    };
}

macro_rules! unidic_pos2_enum {
    ($pos2_name:ident, $($pos2_value:ident),+) => {
        pub enum $pos2_name {
            $(
                $pos2_value,
            )+
        }
    };
}

macro_rules! unidic_pos2_from_unidic {
    ($pos2_name:ident, $($pos2_value:ident),+) => {
        impl $pos2_name {
            pub fn from_unidic(pos2: &str) -> Result<Self> {
                match pos2 {
                    $(
                        stringify!($pos2_value) => Ok($pos2_name::$pos2_value),
                    )+
                    other => Err(UnknownValueError::new(other)),
                }
            }
        }
    };
}

macro_rules! unidic_pos {
    (
        $(
            $pos_name:ident $pos_value:ident $($pos_num: literal)?
            $(= $pos2_name:ident
                $(- $pos2_value:ident $pos2_num:literal)+
            )?
        )+
    ) => {
        unidic_pos_enum!($( $pos_name $($pos2_name)? ),+);
        $(
            $(
                unidic_pos2_enum!($pos2_name, $($pos2_value),+);
                unidic_pos2_from_unidic!($pos2_name, $($pos2_value),+);
            )?
        )+


        impl UnidicPos {
            pub fn from_unidic(pos: &str, pos2: &str) -> Result<Self> {
                match pos {
                    $(
                        stringify!($pos_value) => Ok(UnidicPos::$pos_name $( ($pos2_name::from_unidic(pos2)?) )? ),
                    )+
                    other => Err(UnknownValueError::new(other)),
                }
            }

            pub fn to_short(&self) -> u8 {
                match &self {
                    $(
                        $(
                            UnidicPos::$pos_name => short_value($pos_num),
                        )?
                        $(
                            $(
                                UnidicPos::$pos_name($pos2_name::$pos2_value) => short_value($pos2_num),
                            )+
                        )?

                    )+
                }
            }

            pub fn from_short(short: u8) -> Result<Self> {
                match short {
                    $(
                      $(
                        $pos_num => Ok(UnidicPos::$pos_name),
                      )?
                      $(
                        $(
                            $pos2_num => Ok(UnidicPos::$pos_name($pos2_name::$pos2_value)),
                        )+
                      )?
                    )+
                    other =>Err(UnknownValueError::new(other.to_string()))
                }
            }
        }

    };
}

unidic_pos!(
    Noun 名詞
    = UnidicNounPos2
        - 助動詞語幹 1
        - 固有名詞 2
        - 普通名詞 3
        - 数詞 4

    Particle 助詞
    = UnidicParticlePos2
        - 係助詞 5
        - 格助詞 6
        - 接続助詞 7
        - 準体助詞 8
        - 終助詞 9
        - 副助詞 10

    Verb 動詞
    = UnidicVerbPos2
        - 一般 11
        - 非自立可能 12

    Adjective 形容詞
    = UnidicAdjectivePos2
        - 一般 13
        - 非自立可能 14

    NaAdjective 形状詞
    = UnidicNaAdjectivePos2
        - 一般 15
        - 助動詞語幹 16
        - タリ 17

    Interjection 感動詞
    = UnidicInterjectionPos2
        - 一般 18
        - フィラー 19

    Suffix 接尾辞
    = UnidicSuffixPos2
        - 名詞的 20
        - 形容詞的 21
        - 動詞的 22
        - 形状詞的 23

    AuxVerb 助動詞 24
    Whitespace 空白 25
    Pronoun 代名詞 26

    Symbol 記号
    = UnidicSymbolPos2
        - 一般 27
        - 文字 28

    SupplementarySymbol 補助記号
    = UnidicSupplementarySymbolPos2
        - 読点 29
        - 一般 30
        - 括弧開 31
        - 括弧閉 32
        - ＡＡ 33
        - 句点 34

    Conjunction 接続詞 35
    Prefix 接頭辞 36
    PrenounAdjectival 連体詞 37
    Adverb 副詞 38
);
