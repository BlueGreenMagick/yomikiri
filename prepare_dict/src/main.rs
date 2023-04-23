mod jmdict;
mod xml;

use std::fmt::{Debug, Display};
use std::path::{Path, PathBuf};
use std::env;
use std::fs;

use crate::jmdict::Entry;
use crate::xml::{unescape_entity, parse_xml};

type Result<T> = core::result::Result<T, CustomError>;

#[derive(Debug)]
pub struct CustomError {
    pub msg: String,
}

impl<D: Display> From<D> for CustomError {
    fn from(value: D) -> Self {
        CustomError {
            msg: format!("{}", value),
        }
    }
}


fn main() {
    let (input_path, output_path) = read_arguments();
    println!("Reading from {}, writing to {}", input_path.to_string_lossy(), output_path.to_string_lossy());
    let entries = parse_xml_file(&input_path).unwrap();
    let json_str = serde_json::to_string(&entries).unwrap();
    fs::write(&output_path, json_str).unwrap();
    println!("JSON written to {}", output_path.to_string_lossy());
}

fn read_arguments() -> (PathBuf, PathBuf) {
    let mut args = env::args();
    let msg = "This program requires two arguments: <input dict path> <output_path>";
    let _arg0 = args.next().unwrap();
    let arg1 = args.next().expect(msg);
    let arg2 = args.next().expect(msg);

    let input_path = PathBuf::from(arg1);
    let output_path = PathBuf::from(arg2);
    (input_path, output_path)
}

fn parse_xml_file(input_path: &Path) -> Result<Vec<Entry>>{
    let xml_str = fs::read_to_string(input_path).unwrap();
    let xml_str = unescape_entity(&xml_str);
    println!("Start parsing xml");
    parse_xml(&xml_str)
}
