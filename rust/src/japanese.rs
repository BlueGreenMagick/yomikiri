pub trait JapaneseChar {
    /** Character is hiragana or katakana */
    fn is_kana(&self) -> bool;
}

impl JapaneseChar for char {
    fn is_kana(&self) -> bool {
        matches!(*self, '\u{3040}'..='\u{309f}')
    }
}

pub trait JapaneseString {
    fn contains_only_kana(&self) -> bool;
}

impl JapaneseString for str {
    fn contains_only_kana(&self) -> bool {
        self.chars().all(|c| c.is_kana())
    }
}

/// 五段
#[derive(PartialEq, Eq, Clone, Copy, Debug)]
pub enum GoDan {
    ADan,
    IDan,
    UDan,
    EDan,
    ODan,
}

impl GoDan {
    /// Returns the godan of char, or None.
    pub fn from_char(ch: char) -> Option<GoDan> {
        match ch {
            'あ' | 'か' | 'さ' | 'た' | 'な' | 'は' | 'ま' | 'や' | 'ら' | 'わ' | 'が' | 'ざ'
            | 'だ' | 'ば' | 'ぱ' => Some(GoDan::ADan),
            'い' | 'き' | 'し' | 'ち' | 'に' | 'ひ' | 'み' | 'り' | 'ゐ' | 'ぎ' | 'じ' | 'ぢ'
            | 'び' | 'ぴ' => Some(GoDan::IDan),
            'う' | 'く' | 'す' | 'つ' | 'ぬ' | 'ふ' | 'む' | 'ゆ' | 'る' | 'ぐ' | 'ず' | 'づ'
            | 'ぶ' | 'ぷ' => Some(GoDan::UDan),
            'え' | 'け' | 'せ' | 'て' | 'ね' | 'へ' | 'め' | 'れ' | 'ゑ' | 'げ' | 'ぜ' | 'で'
            | 'べ' | 'ぺ' => Some(GoDan::EDan),
            'お' | 'こ' | 'そ' | 'と' | 'の' | 'ほ' | 'も' | 'よ' | 'ろ' | 'を' | 'ご' | 'ぞ'
            | 'ど' | 'ぼ' | 'ぽ' => Some(GoDan::ODan),
            _ => None,
        }
    }
}

pub trait GoDanEnding {
    fn ends_in_go_dan(&self) -> Option<GoDan>;
}

impl GoDanEnding for str {
    fn ends_in_go_dan(&self) -> Option<GoDan> {
        self.chars().last().map(GoDan::from_char).flatten()
    }
}
