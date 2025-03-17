use crate::tokenize::TokenizeResult;
use crate::SharedBackend;
use anyhow::{anyhow, Result};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[derive(Debug, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
struct SearchArgs {
    query: String,
    char_idx: usize,
}

#[derive(Debug, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
struct TokenizeArgs {
    sentence: String,
    char_idx: usize,
}

#[derive(Debug, Serialize, JsonSchema)]
pub struct RunArgTypes {
    search: SearchArgs,
    tokenize: TokenizeArgs,
    metadata: (),
}

impl<D: AsRef<[u8]> + 'static> SharedBackend<D> {
    pub fn run(&mut self, command: &str, json_args: &str) -> Result<String> {
        match command {
            "search" => {
                let args: SearchArgs = serde_json::from_str(json_args)?;
                let result = self.search(&args.query, args.char_idx)?;
                let json = serde_json::to_string(&result)?;
                Ok(json)
            }
            "tokenize" => {
                let args: TokenizeArgs = serde_json::from_str(json_args)?;
                let result = self.tokenize(&args.sentence, args.char_idx)?;
                let json = serde_json::to_string(&result)?;
                Ok(json)
            }
            "metadata" => {
                let result = self.dictionary.metadata();
                let json = serde_json::to_string(&result)?;
                Ok(json)
            }
            other => Err(anyhow!("Invalid command: {}", other)),
        }
    }
}
