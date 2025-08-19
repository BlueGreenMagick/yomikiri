use schemars::JsonSchema;
use serde::Serialize;

#[derive(Debug, Serialize, JsonSchema)]
pub struct RunArgAndReturnTypes {
    example: String,
}
