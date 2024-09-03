/*
To easily create jm entity enums,
run below code on xml entity declarations.

```js
function macroCode(decl) {
    let output = ""
    for (const m of decls.matchAll(/<!ENTITY ([^\s]+) "([^"]*)">/g)) {
        output += `#[doc="${m[2]}"]`
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
              if is_single_entity(field) {
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

pub(crate) use jm_entity_enum;
