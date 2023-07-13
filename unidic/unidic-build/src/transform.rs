use std::error::Error;
use std::fs;
use std::path::Path;

type TResult<T> = core::result::Result<T, Box<dyn Error>>;

/// TODO...
pub fn transform(input_dir: &Path, transform_dir: &Path) -> TResult<()> {
    let entries = fs::read_dir(input_dir)?;
    for entry in entries {
        let entry = entry?;
        let copy_from = entry.path();
        if let Some(file_name) = copy_from.file_name() {
            let copy_to = transform_dir.join(file_name);
            fs::copy(&copy_from, &copy_to)?;
        }
    }
    Ok(())
}
