use vibrato::errors::Result as VibratoResult;
use vibrato::Dictionary;

macro_rules! const_data {
    ($name: ident, $filename: literal) => {
        const $name: &'static [u8] = include_bytes!(concat!("../output/", $filename));
    };
}

const_data!(DIC_DATA, "unidic.dic");

pub fn load_dictionary() -> VibratoResult<Dictionary> {
    Dictionary::read(DIC_DATA)
}
