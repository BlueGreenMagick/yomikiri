use std::borrow::Cow;
use std::io::{Read, Seek};

use unicode_normalization::{is_nfc_quick, IsNormalized, UnicodeNormalization};

use crate::error::{YResult, YomikiriError};
use crate::tokenize::{RawTokenizeResult, Token, TokenDetails};
use crate::SharedBackend;

impl<R: Read + Seek> SharedBackend<R> {
    pub fn search(&mut self, term: &str, char_idx: usize) -> YResult<RawTokenizeResult> {
        let result = self.tokenize(term, char_idx)?;

        // if tokenize separates the term into multiple tokens,
        // but term exists as-is in dictionary, return that instead.
        if result.tokens.len() > 1 {
            if let Some(res) = self.search_term_as_is(term)? {
                return Ok(res);
            }
        }
        return Ok(result);
    }

    fn search_term_as_is(&mut self, term: &str) -> YResult<Option<RawTokenizeResult>> {
        let normalized_term = if is_nfc_quick(term.chars()) == IsNormalized::Yes {
            Cow::Borrowed(term)
        } else {
            let normalized = term.nfc().collect::<String>();
            Cow::Owned(normalized)
        };

        let entries = self.dictionary.search(&normalized_term)?;
        if let Some(entry) = entries.get(0) {
            let form = entry.main_form();
            // TODO: fill pos of details
            let details = TokenDetails::default_with_surface(&form);
            let token = Token::new(form, details, 0);
            let json_entries = entries
                .iter()
                .map(serde_json::to_string)
                .collect::<serde_json::Result<Vec<String>>>()
                .map_err(|e| {
                    YomikiriError::InvalidDictionaryFile(format!(
                        "Failed to parse dictionary entry JSON. {}",
                        e
                    ))
                })?;
            Ok(Some(RawTokenizeResult {
                tokens: vec![token],
                tokenIdx: 0,
                entries: json_entries,
                grammars: vec![],
            }))
        } else {
            Ok(None)
        }
    }
}
