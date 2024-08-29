use regex::Regex;
use rustyxml::{Event, Parser};

use std::borrow::Cow;

use crate::{Error, Result};

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

pub fn parse_characters(parser: &mut Parser, in_tag: &str) -> Result<String> {
    let mut characters = String::new();
    for event in parser {
        match event? {
            Event::ElementStart(tag) => {
                return Err(Error::Unexpected {
                    expected: "character",
                    actual: format!("starting tag <{}>", &tag.name),
                });
            }
            Event::ElementEnd(tag) => {
                if tag.name == in_tag {
                    return Ok(characters);
                } else {
                    return Err(Error::Unexpected {
                        expected: "character",
                        actual: format!("ending tag </{}>", &tag.name),
                    });
                }
            }
            Event::Characters(chars) => {
                characters.push_str(chars.as_str());
            }
            _ => {}
        }
    }
    Err(format!("Closing tag not found </{}>", in_tag).into())
}
