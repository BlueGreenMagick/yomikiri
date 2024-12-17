use std::borrow::Cow;

use anyhow::Result;
use japanese_utils::JapaneseChar;
use unicode_normalization::{is_nfc_quick, IsNormalized, UnicodeNormalization};

use crate::tokenize::{InnerToken, Token, TokenDetails, TokenizeResult};
use crate::SharedBackend;

/// Maximum number of entries returned when searching for meaning
const MAX_ENTRY_LEN: usize = 100;

impl<D: AsRef<[u8]> + 'static> SharedBackend<D> {
    pub fn search(&mut self, query: &str, char_idx: usize) -> Result<TokenizeResult> {
        if query.chars().any(|c| c.is_japanese_content()) {
            let result = self.tokenize(query, char_idx)?;

            // if tokenize separates the term into multiple tokens,
            // but term exists as-is in dictionary, return that instead.
            if result.tokens.len() > 1 {
                if let Some(res) = self.search_term_as_is(query)? {
                    return Ok(res);
                }
            }

            Ok(result)
        } else {
            let mut entries = self.dictionary.search_meaning(query)?;
            if entries.len() > 100 {
                entries = entries.into_iter().take(MAX_ENTRY_LEN).collect();
            }
            Ok(TokenizeResult::with_entries(entries))
        }
    }

    fn search_term_as_is(&mut self, term: &str) -> Result<Option<TokenizeResult>> {
        let normalized_term = if is_nfc_quick(term.chars()) == IsNormalized::Yes {
            Cow::Borrowed(term)
        } else {
            let normalized = term.nfc().collect::<String>();
            Cow::Owned(normalized)
        };

        let entries = self.dictionary.search(&normalized_term)?;
        if let Some(entry) = entries.first() {
            let form = entry.main_form();
            // TODO: convert jmdict pos to unidic pos
            let mut details = TokenDetails::default_with_base(form);
            let dicpos = entry.first_pos();
            details.pos = dicpos.to_unidic();
            details.reading = entry.main_reading().to_string();
            let inner_token = InnerToken::new(normalized_term, details, 0);
            let token = Token::from(inner_token);
            Ok(Some(TokenizeResult {
                tokens: vec![token],
                tokenIdx: 0,
                entries,
                grammars: vec![],
            }))
        } else {
            Ok(None)
        }
    }
}
