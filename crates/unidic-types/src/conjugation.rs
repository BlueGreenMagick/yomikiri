// make sure all conjugations has unique short value
#![deny(unreachable_patterns)]

use crate::error::{Result, UnknownValueError};
use crate::utils::value_else_name;

macro_rules! unidic_conjugation_form {
    (
      $(
        $name:ident $(=$value:literal)? $short:literal
      ),+
      $(,)*
    ) => {

        pub enum UnidicConjugationForm {
            $(
                $name,
            )+
        }

        impl UnidicConjugationForm {
            pub fn from_unidic(unidic: &str) -> Result<Self> {
                match unidic {
                    $(
                        value_else_name!($($value)? $name) => Ok(UnidicConjugationForm::$name),
                    )+
                    other => Err(UnknownValueError::new(other)),
                }
            }

            pub fn to_unidic(&self) -> &'static str {
                match self {
                    $(
                        UnidicConjugationForm::$name => value_else_name!($($value)? $name),
                    )+
                }
            }

            pub fn from_short(short: u8) -> Result<Self> {
                match short as char {
                    $(
                        $short => Ok(UnidicConjugationForm::$name),
                    )+
                    other => Err(UnknownValueError::new(other.to_string()))
                }
            }

            pub fn to_short(&self) -> u8 {
                match self {
                    $(
                        UnidicConjugationForm::$name => $short as u8,
                    )+
                }
            }
        }
    };
}

unidic_conjugation_form!(
    None="*" 'a',
    ク語法 'b',
    仮定形_一般="仮定形-一般" 'c',
    仮定形_融合="仮定形-融合" 'd',
    命令形 'e',
    已然形_一般="已然形-一般" 'f',
    已然形_補助="已然形-補助" 'g',
    意志推量形 'h',
    未然形_サ="未然形-サ" 'i',
    未然形_セ="未然形-セ" 'j',
    未然形_一般="未然形-一般" 'k',
    未然形_撥音便="未然形-撥音便" 'l',
    未然形_補助="未然形-補助" 'm',
    終止形_ウ音便="終止形-ウ音便" 'n',
    終止形_一般="終止形-一般" 'o',
    終止形_促音便="終止形-促音便" 'p',
    終止形_撥音便="終止形-撥音便" 'q',
    終止形_融合="終止形-融合" 'r',
    終止形_補助="終止形-補助" 's',
    語幹_サ="語幹-サ" 't',
    語幹_一般="語幹-一般" 'u',
    連体形_イ音便="連体形-イ音便" 'v',
    連体形_ウ音便="連体形-ウ音便" 'w',
    連体形_一般="連体形-一般" 'x',
    連体形_一般_送り仮名省略="連体形-一般+送り仮名省略" 'y',
    連体形_撥音便="連体形-撥音便" 'z',
    連体形_省略="連体形-省略" 'A',
    連体形_補助="連体形-補助" 'B',
    連用形_イ音便="連用形-イ音便" 'C',
    連用形_イ音便_送り仮名省略="連用形-イ音便+送り仮名省略" 'D',
    連用形_ウ音便="連用形-ウ音便" 'E',
    連用形_キ接続="連用形-キ接続" 'F',
    連用形_ト="連用形-ト" 'G',
    連用形_ニ="連用形-ニ" 'H',
    連用形_一般="連用形-一般" 'I',
    連用形_一般_送り仮名省略="連用形-一般+送り仮名省略" 'J',
    連用形_促音便="連用形-促音便" 'K',
    連用形_撥音便="連用形-撥音便" 'L',
    連用形_省略="連用形-省略" 'M',
    連用形_融合="連用形-融合" 'N',
    連用形_補助="連用形-補助" 'O',
);
