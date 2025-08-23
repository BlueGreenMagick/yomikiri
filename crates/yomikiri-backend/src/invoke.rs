use crate::tokenize::TokenizeResult;
use crate::SharedBackend;
use anyhow::Result;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use yomikiri_dictionary::dictionary::DictionaryMetadata;

#[derive(Debug, Serialize, Deserialize, JsonSchema)]
#[serde(tag = "type", content = "args")]
enum Command {
    Search(SearchArgs),
    Tokenize(TokenizeArgs),
    DictionaryMetadata(()),
}

#[derive(Debug, Serialize, JsonSchema)]
#[serde(tag = "type", content = "result")]
pub enum CommandResultSpec {
    Search(TokenizeResult),
    Tokenize(TokenizeResult),
    DictionaryMetadata(DictionaryMetadata),
}

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
pub struct TypeBindingExports {
    command: Command,
    command_result_spec: CommandResultSpec,
}

impl<D: AsRef<[u8]> + 'static> SharedBackend<D> {
    pub fn invoke(&mut self, command_json: &str) -> Result<String> {
        let command = serde_json::from_str(command_json)?;
        self._invoke(command)
    }

    fn _invoke(&mut self, command: Command) -> Result<String> {
        use Command::*;
        let json = match command {
            Search(args) => serde_json::to_string(&self.search(&args.query, args.char_idx)?)?,
            Tokenize(args) => {
                serde_json::to_string(&self.tokenize(&args.sentence, args.char_idx)?)?
            }
            DictionaryMetadata(_) => serde_json::to_string(self.dictionary.metadata())?,
        };
        Ok(json)
    }
}
