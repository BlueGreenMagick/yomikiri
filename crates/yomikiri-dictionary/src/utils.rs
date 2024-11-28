use std::borrow::Cow;
use std::ops::Deref;

use unicode_normalization::{is_nfc, is_nfkc, UnicodeNormalization};

pub fn nfc_normalize(text: &str) -> Cow<'_, str> {
    if is_nfc(text) {
        Cow::Borrowed(text)
    } else {
        text.nfc().collect::<String>().into()
    }
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

pub struct NFKCString(String);

impl Deref for NFKCString {
    type Target = String;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl NFKCString {
    /// Assume text is already NFKC normalized
    pub fn assume_normalized<S: Into<String>>(text: S) -> Self {
        Self(text.into())
    }

    /// NFKC normalize text
    pub fn normalize<S: Into<String>>(text: S) -> Self {
        let text = text.into();
        let text = if is_nfkc(&text) {
            text
        } else {
            text.nfkc().collect::<String>()
        };

        Self(text)
    }
}
