// For unidic pos2 value 'ＡＡ'
#![allow(uncommon_codepoints)]
// make sure all unidic pos has unique short value
#![deny(unreachable_patterns)]

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
            $pos_name:ident $pos_value:ident $($pos_short: literal)?
            $(= $pos2_name:ident
                $(- $pos2_value:ident $pos2_short:literal)+
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
                            UnidicPos::$pos_name => $pos_short as u8,
                        )?
                        $(
                            $(
                                UnidicPos::$pos_name($pos2_name::$pos2_value) => $pos2_short as u8,
                            )+
                        )?

                    )+
                }
            }

            pub fn from_short(short: u8) -> Result<Self> {
                match short as char {
                    $(
                      $(
                        $pos_short => Ok(UnidicPos::$pos_name),
                      )?
                      $(
                        $(
                            $pos2_short => Ok(UnidicPos::$pos_name($pos2_name::$pos2_value)),
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
        - 助動詞語幹 'a'
        - 固有名詞 'b'
        - 普通名詞 'c'
        - 数詞 'd'

    Particle 助詞
    = UnidicParticlePos2
        - 係助詞 'e'
        - 格助詞 'f'
        - 接続助詞 'g'
        - 準体助詞 'h'
        - 終助詞 'i'
        - 副助詞 'j'

    Verb 動詞
    = UnidicVerbPos2
        - 一般 'k'
        - 非自立可能 'l'

    Adjective 形容詞
    = UnidicAdjectivePos2
        - 一般 'm'
        - 非自立可能 'n'

    NaAdjective 形状詞
    = UnidicNaAdjectivePos2
        - 一般 'o'
        - 助動詞語幹 'p'
        - タリ 'q'

    Interjection 感動詞
    = UnidicInterjectionPos2
        - 一般 'r'
        - フィラー 's'

    Suffix 接尾辞
    = UnidicSuffixPos2
        - 名詞的 't'
        - 形容詞的 'u'
        - 動詞的 'v'
        - 形状詞的 'w'

    AuxVerb 助動詞 'x'
    Whitespace 空白 'y'
    Pronoun 代名詞 'z'

    Symbol 記号
    = UnidicSymbolPos2
        - 一般 'A'
        - 文字 'B'

    SupplementarySymbol 補助記号
    = UnidicSupplementarySymbolPos2
        - 読点 'C'
        - 一般 'D'
        - 括弧開 'E'
        - 括弧閉 'F'
        - ＡＡ 'G'
        - 句点 'H'

    Conjunction 接続詞 'I'
    Prefix 接頭辞 'J'
    PrenounAdjectival 連体詞 'K'
    Adverb 副詞 'L'
);
