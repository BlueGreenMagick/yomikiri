use std::env;
use std::fs;
use std::path::Path;

use schemars::schema_for;
use yomikiri_rs::invoke::TypeBindingExports;

fn main() {
    let args: Vec<_> = env::args().collect();
    if args.len() < 2 {
        panic!("The output path must be provided as argument");
    }
    let output_path = Path::new(&args[1]);
    if let Some(parent) = output_path.parent() {
        fs::create_dir_all(parent).unwrap();
    }

    let schema = schema_for!(TypeBindingExports);
    let schema_string = serde_json::to_string_pretty(&schema).unwrap();
    fs::write(&output_path, &schema_string).unwrap();
}
