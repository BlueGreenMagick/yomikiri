use crate::types::Token;
use anyhow::Result;
use std::borrow::Cow;
use std::io::Read;
use vaporetto::{Model, Predictor, Sentence};

pub struct Vaporetto {
    predictor: Predictor,
}

pub fn create_tokenizer<R: Read>(reader: R) -> Result<Vaporetto> {
    let model = Model::read(reader)?;
    let predictor = Predictor::new(model, true)?;
    let tokenizer = Vaporetto::new(predictor);
    Ok(tokenizer)
}

impl Vaporetto {
    pub fn new(predictor: Predictor) -> Self {
        Vaporetto { predictor }
    }

    pub fn tokenize(&self, text: &str) -> Result<Vec<Token>> {
        let mut s = Sentence::from_raw(text)?;
        self.predictor.predict(&mut s);
        s.fill_tags();
        let tokens = s
            .iter_tokens()
            .map(|t| {
                let tags = t.tags();
                Token {
                    surface: t.surface().into(),
                    pos: tags[0].as_ref().unwrap_or(&Cow::Borrowed("")).to_string(),
                    reading: tags[1].as_ref().unwrap_or(&Cow::Borrowed("")).to_string(),
                    others: tags
                        .iter()
                        .skip(2)
                        .map(|s| s.as_ref().unwrap_or(&Cow::Borrowed("")).to_string())
                        .collect(),
                }
            })
            .collect();
        Ok(tokens)
    }
}
