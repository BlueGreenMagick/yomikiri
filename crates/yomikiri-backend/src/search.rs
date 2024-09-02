use std::borrow::Cow;

use anyhow::Result;
use unicode_normalization::{is_nfc_quick, IsNormalized, UnicodeNormalization};
use yomikiri_dictionary::entry::jmpos_to_unidic;
use yomikiri_dictionary::PartOfSpeech;

use crate::tokenize::{InnerToken, Token, TokenDetails, TokenizeResult};
use crate::SharedBackend;

impl<D: AsRef<[u8]> + 'static> SharedBackend<D> {
    pub fn search(&mut self, term: &str, char_idx: usize) -> Result<TokenizeResult> {
        let result = self.tokenize(term, char_idx)?;

        // if tokenize separates the term into multiple tokens,
        // but term exists as-is in dictionary, return that instead.
        if result.tokens.len() > 1 {
            if let Some(res) = self.search_term_as_is(term)? {
                return Ok(res);
            }
        }

        Ok(result)
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
            let dicpos = entry
                .grouped_senses
                .first()
                .and_then(|s| s.part_of_speech.first())
                .unwrap_or(&PartOfSpeech::Unclassified);
            details.pos = jmpos_to_unidic(dicpos);
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
