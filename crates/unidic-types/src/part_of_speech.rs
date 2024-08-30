// make sure all unidic pos has unique short value
#![deny(unreachable_patterns)]

use crate::error::{Result, UnknownValueError};
use crate::utils::value_else_name;

macro_rules! unidic_pos_enum {
    ($( $pos_name:ident $pos_value:ident $($pos2_enum:ident)? ),+) => {
        #[derive(Debug, Clone, Eq, PartialEq, Hash, Copy)]
        pub enum UnidicPos {
            $(
                #[doc = stringify!($pos_value)]
                $pos_name $( ( $pos2_enum) )?,
            )+

        }
    };
}

macro_rules! unidic_pos2_enum {
    ($pos2_enum:ident, $pos_value:ident, $($pos2_name:ident),+) => {
        #[derive(Debug, Clone, Eq, PartialEq, Hash, Copy)]
        #[doc = stringify!($pos_value)]
        pub enum $pos2_enum {
            $(
                $pos2_name,
            )+
            /// Used for inserted JMDict entries
            Unknown
        }
    };
}

macro_rules! unidic_pos2_from_unidic {
    ($pos2_enum:ident, $($pos2_name:ident $(= $pos2_value:literal)?),+) => {
        impl $pos2_enum {
            pub fn from_unidic(pos2: &str) -> Result<Self> {
                match pos2 {
                    $(
                        value_else_name!($($pos2_value)? $pos2_name) => Ok($pos2_enum::$pos2_name),
                    )+
                    "*" => Ok($pos2_enum::Unknown),
                    other => Err(UnknownValueError::new(other)),
                }
            }
        }
    };
}

macro_rules! first_only {
    ($first:tt $($vars:tt)*) => {
        $first
    };
}

macro_rules! unidic_pos {
    (
        $(
            $pos_name:ident $pos_value:ident $($pos_short:literal)?
            $(| $pos2_enum:ident $pos2_unknown_short:literal
                $(- $pos2_name:ident $(= $pos2_value:literal)? $pos2_short:literal)+
            )?
        )+
    ) => {
        unidic_pos_enum!($( $pos_name $pos_value $($pos2_enum)? ),+);

        $(
            $(
                unidic_pos2_enum!($pos2_enum, $pos_value, $($pos2_name),+);
                unidic_pos2_from_unidic!($pos2_enum, $($pos2_name $(= $pos2_value)?),+);
            )?
        )+


        impl UnidicPos {
            pub fn from_unidic(pos: &str, pos2: &str) -> Result<Self> {
                match pos {
                    $(
                        stringify!($pos_value) => Ok(UnidicPos::$pos_name $( ($pos2_enum::from_unidic(pos2)?) )? ),
                    )+
                    other => Err(UnknownValueError::new(other)),
                }
            }

            pub fn to_unidic(&self) -> (&'static str, &'static str) {
                match &self {
                    $(
                        $(
                            UnidicPos::$pos_name => first_only!((stringify!($pos_value), "*"), $pos_short),
                        )?
                        $(
                            $(
                                UnidicPos::$pos_name($pos2_enum::$pos2_name) => (stringify!($pos_value), value_else_name!($($pos2_value)? $pos2_name)),
                            )+
                            UnidicPos::$pos_name($pos2_enum::Unknown) => (stringify!($pos_value), "*"),
                        )?

                    )+
                }
            }

            pub fn to_short(&self) -> u8 {
                match &self {
                    $(
                        $(
                            UnidicPos::$pos_name => $pos_short,
                        )?
                        $(
                            $(
                                UnidicPos::$pos_name($pos2_enum::$pos2_name) => $pos2_short,
                            )+
                            UnidicPos::$pos_name($pos2_enum::Unknown) => $pos2_unknown_short,
                        )?

                    )+
                }
            }

            pub fn from_short(short: u8) -> Result<Self> {
                match short {
                    $(
                      $(
                        $pos_short => Ok(UnidicPos::$pos_name),
                      )?
                      $(
                        $(
                            $pos2_short => Ok(UnidicPos::$pos_name($pos2_enum::$pos2_name)),
                        )+
                        $pos2_unknown_short => Ok(UnidicPos::$pos_name($pos2_enum::Unknown)),
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
    | UnidicNounPos2 b'1'
        - 助動詞語幹 b'a'
        - 固有名詞 b'b'
        - 普通名詞 b'c'
        - 数詞 b'd'

    Particle 助詞
    | UnidicParticlePos2 b'2'
        - 係助詞 b'e'
        - 格助詞 b'f'
        - 接続助詞 b'g'
        - 準体助詞 b'h'
        - 終助詞 b'i'
        - 副助詞 b'j'

    Verb 動詞
    | UnidicVerbPos2 b'3'
        - 一般 b'k'
        - 非自立可能 b'l'

    Adjective 形容詞
    | UnidicAdjectivePos2 b'4'
        - 一般 b'm'
        - 非自立可能 b'n'

    NaAdjective 形状詞
    | UnidicNaAdjectivePos2 b'5'
        - 一般 b'o'
        - 助動詞語幹 b'p'
        - タリ b'q'

    Interjection 感動詞
    | UnidicInterjectionPos2 b'6'
        - 一般 b'r'
        - フィラー b's'

    Suffix 接尾辞
    | UnidicSuffixPos2 b'7'
        - 名詞的 b't'
        - 形容詞的 b'u'
        - 動詞的 b'v'
        - 形状詞的 b'w'

    AuxVerb 助動詞 b'x'
    Whitespace 空白 b'y'
    Pronoun 代名詞 b'z'

    Symbol 記号
    | UnidicSymbolPos2 b'8'
        - 一般 b'A'
        - 文字 b'B'

    SupplementarySymbol 補助記号
    | UnidicSupplementarySymbolPos2 b'9'
        - 読点 b'C'
        - 一般 b'D'
        - 括弧開 b'E'
        - 括弧閉 b'F'
        - AA="ＡＡ" b'G'
        - 句点 b'H'

    Conjunction 接続詞 b'I'
    Prefix 接頭辞 b'J'
    PrenounAdjectival 連体詞 b'K'
    Adverb 副詞 b'L'
    Expression exp b'M'
    Unknown UNK b'O'
);
