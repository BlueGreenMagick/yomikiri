use csv;
use std::error::Error;
use std::fs;
use std::path::Path;

type TResult<T> = core::result::Result<T, Box<dyn Error>>;

pub fn transform(input_dir: &Path, transform_dir: &Path) -> TResult<()> {
    let entries = fs::read_dir(input_dir)?;
    for entry in entries {
        let entry = entry?;
        let copy_from = entry.path();
        if let Some(file_name) = copy_from.file_name() {
            let copy_to = transform_dir.join(&file_name);
            let file_name = file_name.to_str().unwrap();
            match file_name {
                "lex_naist.csv" => {
                    transform_lex(&copy_from, &transform_dir.join("lex.csv"))?;
                }
                _ => {
                    fs::copy(&copy_from, &copy_to)?;
                }
            }
        }
    }
    Ok(())
}

/// 1. remove fields that are not used.
/// 2. remove entries for emojis and alphabetic, special characters
fn transform_lex(lex_path: &Path, output_path: &Path) -> TResult<()> {
    let mut reader = csv::Reader::from_path(lex_path)?;
    let mut writer = csv::Writer::from_path(output_path)?;

    let iter = reader.records();
    // remove emojis and single characters
    let iter = iter.skip(2977);

    for record in iter {
        let record = record?;
        let key = record.get(0).unwrap();
        let lid = record.get(1).unwrap();
        let rid = record.get(2).unwrap();
        let cost = record.get(3).unwrap();
        let pos = record.get(4).unwrap();
        let pos2 = record.get(5).unwrap();
        let reading = record.get(24).unwrap();
        let base = record.get(14).unwrap();
        // retain only useful fields
        writer.write_record(&[key, lid, rid, cost, pos, pos2, reading, base])?;
    }
    Ok(())
}
