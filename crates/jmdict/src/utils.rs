/*
To easily create jm entity enums,
run below code on xml entity declarations.

```js
function macroCode(decl) {
    let output = ""
    for (const m of decls.matchAll(/<!ENTITY ([^\s]+) "([^"]*)">/g)) {
        output += `#[doc="${m[2]}"]\n`
        output += 'b"'
        output += m[1]
        output += '" => '
        const firstWord =  m[2].split(" ")[0]
        output += firstWord[0].toUpperCase() + firstWord.slice(1)
        output += ",\n"
    }
    return output
}

let decls = `<Paste entity declarations in xml>`
console.log(macroCode(decls))
```
*/

macro_rules! jm_entity_enum {
  (
      $( #[$enum_attrs:meta] )*
      $enum_name:ident;
      $(
        $( #[$attrs:meta] )*
        $( $key:pat $(if $guard:expr)? )? => $variant:ident
      ),+,
  ) => {
      #[cfg_attr(feature = "wasm", derive(::tsify_next::Tsify))]
      #[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
      #[serde(rename_all = "camelCase")]
      $( #[$enum_attrs] )*
      pub enum $enum_name {
          $(
              $( #[$attrs] )*
              $variant,
          )+
      }

      impl $enum_name {
          pub fn parse_field(field: &[u8]) -> Option<$enum_name> {
              if crate::utils::is_single_entity(field) {
                  match &field[1..field.len() -1] {
                      $(
                          $(
                            $key $(if $guard)? => Some(Self::$variant),
                          )?
                      )+
                      _ => None,
                  }
              } else {
                  None
              }

          }
      }
  };
}

/// `parse_entity_enum!(reader, EnumName, "tag", add_to)`
///
/// Parses a field in "tag" using `EnumName::parse_field()`,
/// and if it returns `Some(val)`, run `add_to.push(val)`
macro_rules! parse_entity_enum {
    ($reader:ident, $enum: ident, $tag: literal, $to:expr ) => {
        let field = crate::xml::parse_text_in_tag($reader, $tag.as_bytes())?;
        let value = $enum::parse_field(&field);
        if let Some(value) = value {
            $to.push(value);
        } else {
            warn!("Unknown {}: {}", $tag, String::from_utf8_lossy(&field));
        }
    };
}

/// `parse_entity_enum_into!(EnumName, reader, buf, "tag", add_to)`
///
/// Parses a field in "tag" using `EnumName::parse_field()`,
/// and if it returns `Some(val)`, run `add_to.push(val)`
macro_rules! parse_entity_enum_into {
    ($enum: ident, $reader:expr, $buf:expr, $tag: literal, $to:expr ) => {
        let field = crate::xml::parse_text_in_tag_into($reader, $buf, $tag.as_bytes())?;
        let value = $enum::parse_field(&field);
        if let Some(value) = value {
            $to.push(value);
        } else {
            warn!("Unknown {}: {}", $tag, String::from_utf8_lossy(&field));
        }
    };
}

/// returns true if
pub(crate) fn is_single_entity(text: &[u8]) -> bool {
    if text.len() > 2 && text[0] == b'&' && text[text.len() - 1] == b';' {
        let inner = &text[1..text.len() - 1];
        if !inner.contains(&b';') {
            return true;
        }
    }
    false
}

pub(crate) use jm_entity_enum;
pub(crate) use parse_entity_enum;
pub(crate) use parse_entity_enum_into;
