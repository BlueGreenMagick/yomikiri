use std::borrow::Cow;

use unicode_normalization::{is_nfkc, UnicodeNormalization};

pub fn nfkc_normalize<'a, S: Into<Cow<'a, str>>>(text: S) -> Cow<'a, str> {
    let text: Cow<'_, str> = text.into();

    if is_nfkc(&text) {
        text
    } else {
        Cow::Owned(text.nfkc().collect())
    }
}
