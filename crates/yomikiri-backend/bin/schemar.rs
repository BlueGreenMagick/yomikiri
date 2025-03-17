use std::fs;
use std::path::Path;

use schemars::schema_for;
use yomikiri_rs::run::RunArgTypes;

fn main() {
    let schema = schema_for!(RunArgTypes);
    let path = Path::new("./bindings/generated.schema.json");
    let schema_string = serde_json::to_string_pretty(&schema).unwrap();
    fs::write(&path, &schema_string).unwrap();
}
