use std::env;

use std::path::PathBuf;
use yomikiri_dictionary::{parse_xml_file, write_json_files};

fn main() {
    let (input_path, output_path, output_index_path) = read_arguments();
    println!(
        "Reading from {}, writing to {} and {}",
        input_path.to_string_lossy(),
        output_path.to_string_lossy(),
        output_index_path.to_string_lossy()
    );
    let entries = parse_xml_file(&input_path).unwrap();

    println!("Start writing yomikiridict and yomikiriindex");
    let largest_size = write_json_files(&output_index_path, &output_path, &entries).unwrap();

    println!("Data writing complete.");
    println!("Largest entry binary size is {}", largest_size);
}

fn read_arguments() -> (PathBuf, PathBuf, PathBuf) {
    let mut args = env::args();
    let msg = "This program requires three arguments: <input dict path> <output_path> <output_index_path>";
    let _arg0 = args.next().unwrap();
    let arg1 = args.next().expect(msg);
    let arg2 = args.next().expect(msg);
    let arg3 = args.next().expect(msg);

    let input_path = PathBuf::from(arg1);
    let output_path = PathBuf::from(arg2);
    let output_index_path = PathBuf::from(arg3);
    (input_path, output_path, output_index_path)
}
