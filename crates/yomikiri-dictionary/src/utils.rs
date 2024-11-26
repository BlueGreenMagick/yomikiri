use std::borrow::Cow;
use std::ops::Deref;

use unicode_normalization::{is_nfc, is_nfkd, UnicodeNormalization};

pub fn nfc_normalize(text: &str) -> Cow<'_, str> {
    if is_nfc(text) {
        Cow::Borrowed(text)
    } else {
        text.nfc().collect::<String>().into()
    }
}

/// Removes diacritic marks and decomposes some ligatures
pub fn normalize_latin_basic_form(text: &NFCString) -> Cow<'_, str> {
    if is_nfkd(text) {
        Cow::Borrowed(text)
    } else {
        text.nfkd()
            .filter(is_not_diacritical_marks)
            .collect::<String>()
            .into()
    }
}

/// `ch` is not diacritic marks
fn is_not_diacritical_marks(ch: &char) -> bool {
    *ch < '\u{0300}' || *ch > '\u{036f}'
}

/// NFC normalized string
pub struct NFCString(String);

impl Deref for NFCString {
    type Target = String;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl NFCString {
    /// Assume text is already NFC normalized
    pub fn assume_normalized<S: Into<String>>(text: S) -> Self {
        Self(text.into())
    }

    /// NFC normalize text
    pub fn normalize<S: Into<String>>(text: S) -> Self {
        let text = text.into();
        let text = if is_nfc(&text) {
            text
        } else {
            text.nfc().collect::<String>()
        };

        Self(text)
    }
}
