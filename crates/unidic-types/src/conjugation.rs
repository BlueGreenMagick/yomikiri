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

        #[derive(Debug, Clone, Copy, Eq, PartialEq, Hash)]
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
                match short {
                    $(
                        $short => Ok(UnidicConjugationForm::$name),
                    )+
                    other => Err(UnknownValueError::new(other.to_string()))
                }
            }

            pub fn to_short(&self) -> u8 {
                match self {
                    $(
                        UnidicConjugationForm::$name => $short,
                    )+
                }
            }
        }
    };
}

impl UnidicConjugationForm {
    /// 終止形
    pub fn is_predicative(&self) -> bool {
        matches!(
            &self,
            UnidicConjugationForm::終止形_ウ音便
                | UnidicConjugationForm::終止形_一般
                | UnidicConjugationForm::終止形_促音便
                | UnidicConjugationForm::終止形_撥音便
                | UnidicConjugationForm::終止形_融合
                | UnidicConjugationForm::終止形_補助
        )
    }

    /// 連用形
    pub fn is_continuative(&self) -> bool {
        matches!(
            &self,
            UnidicConjugationForm::連用形_イ音便
                | UnidicConjugationForm::連用形_イ音便_送り仮名省略
                | UnidicConjugationForm::連用形_ウ音便
                | UnidicConjugationForm::連用形_キ接続
                | UnidicConjugationForm::連用形_ト
                | UnidicConjugationForm::連用形_ニ
                | UnidicConjugationForm::連用形_一般
                | UnidicConjugationForm::連用形_一般_送り仮名省略
                | UnidicConjugationForm::連用形_促音便
                | UnidicConjugationForm::連用形_撥音便
                | UnidicConjugationForm::連用形_省略
                | UnidicConjugationForm::連用形_融合
        )
    }
}

unidic_conjugation_form!(
    None="*" b'a',
    ク語法 b'b',
    仮定形_一般="仮定形-一般" b'c',
    仮定形_融合="仮定形-融合" b'd',
    命令形 b'e',
    已然形_一般="已然形-一般" b'f',
    已然形_補助="已然形-補助" b'g',
    意志推量形 b'h',
    未然形_サ="未然形-サ" b'i',
    未然形_セ="未然形-セ" b'j',
    未然形_一般="未然形-一般" b'k',
    未然形_撥音便="未然形-撥音便" b'l',
    未然形_補助="未然形-補助" b'm',
    終止形_ウ音便="終止形-ウ音便" b'n',
    終止形_一般="終止形-一般" b'o',
    終止形_促音便="終止形-促音便" b'p',
    終止形_撥音便="終止形-撥音便" b'q',
    終止形_融合="終止形-融合" b'r',
    終止形_補助="終止形-補助" b's',
    語幹_サ="語幹-サ" b't',
    語幹_一般="語幹-一般" b'u',
    連体形_イ音便="連体形-イ音便" b'v',
    連体形_ウ音便="連体形-ウ音便" b'w',
    連体形_一般="連体形-一般" b'x',
    連体形_一般_送り仮名省略="連体形-一般+送り仮名省略" b'y',
    連体形_撥音便="連体形-撥音便" b'z',
    連体形_省略="連体形-省略" b'A',
    連体形_補助="連体形-補助" b'B',
    連用形_イ音便="連用形-イ音便" b'C',
    連用形_イ音便_送り仮名省略="連用形-イ音便+送り仮名省略" b'D',
    連用形_ウ音便="連用形-ウ音便" b'E',
    連用形_キ接続="連用形-キ接続" b'F',
    連用形_ト="連用形-ト" b'G',
    連用形_ニ="連用形-ニ" b'H',
    連用形_一般="連用形-一般" b'I',
    連用形_一般_送り仮名省略="連用形-一般+送り仮名省略" b'J',
    連用形_促音便="連用形-促音便" b'K',
    連用形_撥音便="連用形-撥音便" b'L',
    連用形_省略="連用形-省略" b'M',
    連用形_融合="連用形-融合" b'N',
    連用形_補助="連用形-補助" b'O',
);
