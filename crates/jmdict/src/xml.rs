use regex::Regex;

use std::borrow::Cow;

/// RustyXML errors upon custom entity `&xx;`
/// So unescape to `=xx=` before parsing
pub fn unescape_entity(xml: &str) -> Cow<'_, str> {
    let re = Regex::new(r#"&([\w\d-]+);"#).unwrap();
    re.replace_all(xml, "=$1=")
}

/// RustyXML cannot parse DOCTYPE declarations
pub fn remove_doctype(xml: &str) -> String {
    let re = Regex::new(r#"<!DOCTYPE \w+ \[[^\]]+\]>"#).unwrap();
    re.replace(xml, "").into_owned()
}
