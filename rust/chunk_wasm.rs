use std::error::Error;
use std::fs;
use std::fs::File;
use std::io::Read;
use std::path::Path;

const CHUNK_SIZE: usize = 16 * 1024 * 1024;

/// parent of `output_dir` must exist
///
/// Returns number of created chunks
fn split_file_chunk(file_path: &Path, output_dir: &Path) -> Result<u32, Box<dyn Error>> {
    if !output_dir.exists() {
        fs::create_dir(output_dir)?;
    } else if !output_dir.is_dir() {
        return Err("output_dir exists and is not a directory!".into());
    }

    let file_name = file_path.file_name().unwrap().to_string_lossy();
    let mut chunk = Vec::with_capacity(CHUNK_SIZE);
    let mut file = File::open(file_path)?;
    let mut i = 0;

    loop {
        let read_len = file
            .by_ref()
            .take(CHUNK_SIZE as u64)
            .read_to_end(&mut chunk)?;
        let output_file_name = format!("{}.{}.chunk", file_name, i);
        let output_file_path = output_dir.join(output_file_name);
        fs::write(output_file_path, &chunk)?;
        if read_len != CHUNK_SIZE {
            break;
        }
        chunk.clear();
        i += 1;
    }

    Ok(i)
}

fn main() {
    split_file_chunk(
        Path::new("./pkg/yomikiri_rs_bg.wasm"),
        Path::new("./pkg/chunks"),
    )
    .unwrap();
}
