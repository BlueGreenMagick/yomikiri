use quick_xml::escape::{resolve_predefined_entity, unescape_with};
use quick_xml::events::{BytesEnd, BytesStart, Event};
use quick_xml::reader::Reader;

use core::str;
use std::borrow::Cow;

use crate::{Error, Result};

pub trait TagName<'a>
where
    Self: 'a,
{
    /** Returns "\<Invalid UTF-8\>" if tag name is not valid utf-8 */
    fn tag_name(&'a self) -> &'a str;
}

impl<'a> TagName<'a> for BytesStart<'a> {
    fn tag_name(&'a self) -> &'a str {
        str::from_utf8(self.name().0).unwrap_or("<Invalid UTF-8>")
    }
}

impl<'a> TagName<'a> for BytesEnd<'a> {
    fn tag_name(&'a self) -> &'a str {
        str::from_utf8(self.name().0).unwrap_or("<Invalid UTF-8>")
    }
}

pub fn parse_text_in_tag(reader: &mut Reader<&[u8]>, in_tag: &[u8]) -> Result<String> {
    let mut characters = String::new();
    loop {
        match reader.read_event()? {
            Event::Start(tag) => {
                return Err(Error::Unexpected {
                    expected: "text",
                    actual: format!("starting tag <{}>", tag.tag_name()),
                });
            }
            Event::Text(text) => {
                let text = text.into_inner();
                let segment = str::from_utf8(&text)?;
                characters.push_str(segment);
            }
            Event::End(tag) => {
                if tag.name().0 == in_tag {
                    let text = resolve_custom_entity_item(&characters);
                    let text = unescape_with(&text, unescape_entity)?;
                    return Ok(text.into());
                } else {
                    return Err(Error::Unexpected {
                        expected: "character",
                        actual: format!("ending tag </{}>", tag.tag_name()),
                    });
                }
            }
            _ => {
                unimplemented!()
            }
        }
    }
}

/// Resolves entity in text that only contains 1 custom entity and no other text
///
/// '&ent;' is resolved to '=ent='.
fn resolve_custom_entity_item<'a>(text: &'a str) -> Cow<'a, str> {
    if !text.starts_with('&') || !text.ends_with(';') {
        Cow::Borrowed(text)
    } else {
        let inner = &text[1..text.len() - 1];
        if inner.contains(';') {
            Cow::Borrowed(text)
        } else {
            let resolved = format!("={}=", inner);
            Cow::Owned(resolved)
        }
    }
}

/// Unescapes xml entities, resolving custom entities to empty string "".
///
/// Custom entities should be handled before this function is used to unescape entity.
fn unescape_entity(entity: &str) -> Option<&'static str> {
    if let Some(unescaped) = resolve_predefined_entity(entity) {
        Some(unescaped)
    } else {
        Some("")
    }
}
