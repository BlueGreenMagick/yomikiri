use std::borrow::Cow;
use std::ops::Deref;

use unicode_normalization::{is_nfc, UnicodeNormalization};

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
