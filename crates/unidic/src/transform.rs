use anyhow::{anyhow, Result};
use fs_err::{self as fs, File};
use std::cmp;
use std::collections::{HashMap, HashSet};
use std::io::{BufWriter, Write};
use std::path::Path;
use std::str::FromStr;
use yomikiri_dictionary::dictionary::Dictionary;
use yomikiri_dictionary::entry::{jmpos_to_unidic, Entry, PartOfSpeech, Rarity};
use yomikiri_dictionary::DICT_FILENAME;
use yomikiri_unidic_types::{UnidicConjugationForm, UnidicPos};

struct LexItem {
    surface: String,
    lid: u32,
    rid: u32,
    cost: String,
    base: String,
    reading: String,
    pos: String,
    pos2: String,
    pos3: String,
    conjugation: String,
}

impl LexItem {
    // 1. For each non-rare form:
    //        create LexItem
    // 2. For each non-rare reading:
    //     if reading.nokanji or forms is empty:
    //         create LexItem
    // unclassified pos are excluded
    fn items_from_entry(entry: &Entry) -> Vec<LexItem> {
        // (form, pos) => (reading, cost)
        let mut items: HashMap<(&str, PartOfSpeech), (&str, usize)> = HashMap::new();

        for kanji in &entry.kanjis {
            if kanji.rarity != Rarity::Normal {
                continue;
            }
            // some kanjis may not have associated reading. e.g. 気持ち好い (sK)
            let reading = match entry.reading_for_kanji(&kanji.kanji) {
                Some(r) => r,
                None => continue,
            };
            let cost = cmp::min(7000 + 1000 * kanji.kanji.chars().count(), i16::MAX as usize);

            for grouped_sense in &entry.grouped_senses {
                let applicable = grouped_sense
                    .senses
                    .iter()
                    .any(|s| s.to_kanji.len() == 0 || s.to_kanji.contains(&kanji.kanji));
                if applicable {
                    for pos in &grouped_sense.part_of_speech {
                        items.insert((&kanji.kanji, *pos), (&reading.reading, cost));
                    }
                }
            }
        }

        let found_kanji_form = !items.is_empty();

        for reading in &entry.readings {
            if reading.rarity != Rarity::Normal {
                continue;
            }

            if !found_kanji_form || reading.nokanji {
                let cost = cmp::min(
                    10000 + 500 * reading.reading.chars().count(),
                    i16::MAX as usize,
                );
                for grouped_sense in &entry.grouped_senses {
                    let applicable = grouped_sense.senses.iter().any(|s| {
                        s.to_reading.len() == 0 || s.to_reading.contains(&reading.reading)
                    });
                    if applicable {
                        for pos in &grouped_sense.part_of_speech {
                            items.insert((&reading.reading, *pos), (&reading.reading, cost));
                        }
                    }
                }
            }
        }

        let base = entry.main_form();
        let mut lex_items = vec![];
        for ((form, pos), (reading, cost)) in items {
            let lex_item = LexItem {
                surface: form.to_string(),
                lid: 0,
                rid: 0,
                cost: cost.to_string(),
                base: base.to_string(),
                reading: reading.to_string(),
                pos: part_of_speech_to_unidic(&pos).into(),
                pos2: "*".into(),
                pos3: "*".into(),
                conjugation: "*".into(),
            };
            lex_items.push(lex_item)
        }

        lex_items
    }

    fn to_record(&self) -> Result<[String; 8]> {
        let pos = UnidicPos::from_unidic(&self.pos, &self.pos2)?;
        let pos_short = String::from_utf8(vec![pos.to_short()])?;
        let conjugation = UnidicConjugationForm::from_unidic(&self.conjugation)?;
        let conjugation_short = String::from_utf8(vec![conjugation.to_short()])?;
        Ok([
            self.surface.to_string(),
            self.lid.to_string(),
            self.rid.to_string(),
            self.cost.to_string(),
            pos_short,
            conjugation_short,
            self.reading.to_string(),
            self.base.to_string(),
        ])
    }
}

/// Transforms files in `input_dir` and put it into `transform_dir`.
///
/// yomikiridict files are required in `resource_dir`
pub fn transform(input_dir: &Path, transform_dir: &Path, resource_dir: &Path) -> Result<()> {
    let entries = fs::read_dir(input_dir)?;
    for entry in entries {
        let entry = entry?;
        let copy_from = entry.path();
        if let Some(file_name) = copy_from.file_name() {
            let copy_to = transform_dir.join(&file_name);
            let file_name = file_name.to_str().unwrap();
            match file_name {
                "lex.csv" => {}
                // "matrix.def" => {}
                _ => {
                    fs::copy(&copy_from, &copy_to)?;
                }
            }
        }
    }

    let lex_csv_path = input_dir.join("lex.csv");
    let matrix_def_path = input_dir.join("matrix.def");

    if !lex_csv_path.exists() {
        return Err(anyhow!("lex.csv file was not found"));
    }
    if !matrix_def_path.exists() {
        return Err(anyhow!("matrix.def file was not found"));
    }

    // let (lid_map, rid_map) =
    transform_lex(
        &lex_csv_path,
        transform_dir,
        &resource_dir.join(DICT_FILENAME),
    )?;

    // transform_matrix(&matrix_def_path, transform_dir, lid_map, rid_map)?;

    Ok(())
}

/// 1. remove fields that are not used.
/// 2. remove entries for emojis and alphabetic, special characters
/// 3. Add entries from JMDict that is not in unidic
fn transform_lex(lex_path: &Path, output_dir: &Path, dict_path: &Path) -> Result<()> {
    let mut items: Vec<LexItem> = Vec::with_capacity(1500000);

    let mut reader = csv::Reader::from_path(lex_path)?;
    let iter = reader.records();

    for record in iter {
        let record = record?;

        let mut item = LexItem {
            surface: record.get(0).unwrap().into(),
            lid: record.get(1).unwrap().parse()?,
            rid: record.get(2).unwrap().parse()?,
            cost: record.get(3).unwrap().into(),
            pos: record.get(4).unwrap().into(),
            pos2: record.get(5).unwrap().into(),
            pos3: record.get(6).unwrap().into(),
            reading: record.get(21).unwrap().into(),
            base: record.get(11).unwrap().into(),
            conjugation: record.get(9).unwrap().into(),
        };

        // remove info in base e.g.　「私-代名詞」　「アイアコス-Aeacus」
        if let Some((front, _)) = item.base.split_once('-') {
            item.base = front.into();
        }
        items.push(item);
    }

    let jmdict_entries = read_yomikiri_dictionary(dict_path)?;
    remove_emoticons(&mut items);
    add_words_in_jmdict(&mut items, &jmdict_entries)?;
    let removed = remove_word_not_in_jmdict(&mut items, &jmdict_entries)?;

    identical_base_to_empty_string(&mut items);
    identical_reading_to_empty_string(&mut items);

    // write removed items for debugging purposes
    // .hidden is attached so lindera does not add it to its dictionary
    let removed_lex_path = output_dir.join("removed.csv.hidden");
    let mut writer = csv::Writer::from_path(&removed_lex_path)?;
    for item in removed {
        writer.write_record(&item.to_record()?)?;
    }

    // let (lid_map, rid_map) = reindex_ids(&mut items);

    let output_lex_path = output_dir.join("lex.csv");
    let mut writer = csv::Writer::from_path(&output_lex_path)?;
    for item in items {
        writer.write_record(&item.to_record()?)?;
    }

    // Ok((lid_map, rid_map))
    Ok(())
}

#[allow(dead_code)]
fn transform_matrix(
    matrix_path: &Path,
    output_dir: &Path,
    lid_map: IdMap,
    rid_map: IdMap,
) -> Result<()> {
    let prev_matrix_contents = fs::read_to_string(matrix_path)?;
    let mut lines = Vec::with_capacity(4 * 1000 * 1000);
    for string_line in prev_matrix_contents.lines() {
        let parsed: Vec<i32> = string_line
            .split_ascii_whitespace()
            .map(i32::from_str)
            .collect::<Result<_, _>>()?;
        lines.push(parsed);
    }
    let mut lines_iter = lines.iter();
    let header = lines_iter.next().unwrap();
    let prev_rid_len = header[0] as u32;
    let prev_lid_len = header[1] as u32;
    let len = 2 + (prev_rid_len * prev_lid_len) as usize;
    let mut costs = vec![i16::MAX; len];
    for fields in lines_iter {
        let rid = fields[0] as u32;
        let lid = fields[1] as u32;
        let cost = fields[2] as i16;
        costs[(lid + rid * prev_lid_len) as usize] = cost
    }

    // note that in matrix.def, the order is (right, left)
    // instead of (left,right) as used in lex.csv
    let output_matrix_path = output_dir.join("matrix.def");
    let file = File::create(output_matrix_path)?;
    let mut writer = BufWriter::new(file);

    let rid_len = rid_map.new_to_old.len();
    let lid_len = lid_map.new_to_old.len();

    // header
    writer.write_all(format!("{} {}\n", rid_len, lid_len).as_bytes())?;

    for r in 0..rid_len {
        for l in 0..lid_len {
            let old_r = rid_map.new_to_old[r];
            let old_l = lid_map.new_to_old[l];

            let cost = costs[(old_l + old_r * prev_lid_len) as usize];
            writer.write_all(format!("{} {} {}\n", r, l, cost).as_bytes())?;
        }
    }
    Ok(())
}

/// Remove emoticons from lex to reduce size.
/// Emoticons don't usually have japanese characters,
/// so it shouldn't pollute the result of tokenization anyway.
fn remove_emoticons(items: &mut Vec<LexItem>) {
    items.retain(|item| !is_emoticon(item));
}

fn is_emoticon(item: &LexItem) -> bool {
    item.pos3 == "顔文字"
}

/// Add katakana words in JMDict that is not in Unidic lex
/// and are not longer than 7 chars
fn add_words_in_jmdict(items: &mut Vec<LexItem>, entries: &Vec<Entry>) -> Result<()> {
    let mut item_bases: HashSet<String> = HashSet::with_capacity(items.len() * 2);
    for i in items.iter() {
        item_bases.insert(i.base.clone());
    }

    for entry in entries {
        if entry.has_pos(PartOfSpeech::Expression) || entry.has_pos(PartOfSpeech::Particle) {
            continue;
        }
        if entry_form_in_item_bases(&item_bases, entry) {
            continue;
        }
        let new_items = LexItem::items_from_entry(entry);
        for item in new_items.into_iter() {
            if !item.base.chars().any(|c| c.is_katakana()) {
                continue;
            }
            if item.base.chars().count() > 7 {
                continue;
            }
            item_bases.insert(item.base.clone());
            items.push(item);
        }
    }
    Ok(())
}

/// Remove LexItems whose base or surface is not in JMDict.
/// Returns removed LexItems.
fn remove_word_not_in_jmdict(
    items: &mut Vec<LexItem>,
    entries: &Vec<Entry>,
) -> Result<Vec<LexItem>> {
    let mut terms: HashSet<&str> = HashSet::with_capacity(entries.len() * 4);
    for entry in entries {
        for term in entry
            .kanjis
            .iter()
            .map(|k| &k.kanji)
            .chain(entry.readings.iter().map(|r| &r.reading))
        {
            terms.insert(term);
        }
    }

    let mut retain_len = 0_usize;
    for i in 0..items.len() {
        let item = &items[i];

        // don't remove symbols as it is needed to correctly tokenize tokens.
        // 1) single hiragana character symbols are needed so unknown token is not invoked
        // 2) symbols may help correctly split tokens around it.
        if terms.contains(item.base.as_str())
            || terms.contains(item.surface.as_str())
            || item.pos == "補助記号"
        {
            items.swap(i, retain_len);
            retain_len += 1;
        }
    }
    let removed = items.split_off(retain_len);
    Ok(removed)
}

/// if item.surface == item.base (most nouns), set base to "" to save space
fn identical_base_to_empty_string(items: &mut Vec<LexItem>) {
    for item in items {
        if item.surface == item.base {
            item.base = "".into()
        }
    }
}

/// if item.surface == item.reading (most kana-only words), set reading to "" to save space
fn identical_reading_to_empty_string(items: &mut Vec<LexItem>) {
    for item in items {
        let katakana_surface: String = item.surface.chars().map(|c| c.to_katakana()).collect();
        if katakana_surface == item.reading {
            item.reading = "".into()
        }
    }
}

fn entry_form_in_item_bases(item_bases: &HashSet<String>, entry: &Entry) -> bool {
    for kanji in &entry.kanjis {
        if item_bases.contains(&kanji.kanji) {
            return true;
        }
    }
    for reading in &entry.readings {
        if item_bases.contains(&reading.reading) {
            return true;
        }
    }

    false
}

fn part_of_speech_to_unidic(pos: &PartOfSpeech) -> &'static str {
    jmpos_to_unidic(pos).to_unidic().0
}

pub fn read_yomikiri_dictionary(dict_path: &Path) -> Result<Vec<Entry>> {
    let mut entries = vec![];

    let dict_bytes = fs::read(dict_path)?;
    let dict = Dictionary::try_decode(dict_bytes)?;
    let entry_array = &dict.borrow_view().entries;
    let entries_len = entry_array.len();
    for i in 0..entries_len {
        let entry = entry_array.get(i)?;
        entries.push(entry);
    }

    Ok(entries)
}

#[allow(dead_code)]
struct IdMap {
    old_to_new: Vec<Option<u32>>,
    new_to_old: Vec<u32>,
}

/// Reindex left-id and right-ids of lex items
///
/// Returns (left-id map, right-id map)
/// where the id map is a vector of [new id] -> old id
///
/// Mutates item.lid and item.rid to new id
#[allow(dead_code)]
fn reindex_ids(items: &mut [LexItem]) -> (IdMap, IdMap) {
    // get largest lid/rid
    let mut largest_lid = 0;
    let mut largest_rid = 0;
    for item in items.iter() {
        largest_lid = u32::max(largest_lid, item.lid);
        largest_rid = u32::max(largest_rid, item.rid);
    }
    let lid_len = (largest_lid + 1) as usize;
    let rid_len = (largest_rid + 1) as usize;

    // mark if lid/rid is used
    let mut used_lids: Vec<bool> = vec![false; lid_len];
    let mut used_rids: Vec<bool> = vec![false; rid_len];
    for item in items.iter() {
        used_lids[item.lid as usize] = true;
        used_rids[item.rid as usize] = true;
    }

    // create ids map
    let mut old_to_new_lids: Vec<Option<u32>> = vec![None; lid_len];
    let mut old_to_new_rids: Vec<Option<u32>> = vec![None; rid_len];
    let mut new_to_old_lids: Vec<u32> = Vec::with_capacity(lid_len);
    let mut new_to_old_rids: Vec<u32> = Vec::with_capacity(rid_len);

    for old_lid in 0..used_lids.len() {
        if !used_lids[old_lid] {
            continue;
        }
        let new_lid = new_to_old_lids.len() as u32;
        old_to_new_lids[old_lid] = Some(new_lid);
        new_to_old_lids.push(old_lid as u32);
    }

    for old_rid in 0..used_rids.len() {
        if !used_lids[old_rid] {
            continue;
        }
        let new_rid = new_to_old_rids.len() as u32;
        old_to_new_rids[old_rid] = Some(new_rid);
        new_to_old_rids.push(old_rid as u32);
    }

    // change item lid and rid
    for item in items.iter_mut() {
        item.lid = old_to_new_lids[item.lid as usize].unwrap();
        item.rid = old_to_new_rids[item.rid as usize].unwrap();
    }

    let left_map = IdMap {
        old_to_new: old_to_new_lids,
        new_to_old: new_to_old_lids,
    };
    let right_map = IdMap {
        old_to_new: old_to_new_rids,
        new_to_old: new_to_old_rids,
    };

    (left_map, right_map)
}

pub trait JapaneseChar {
    fn is_katakana(&self) -> bool;
    fn to_katakana(&self) -> char;
}

impl JapaneseChar for char {
    fn is_katakana(&self) -> bool {
        matches!(*self, '\u{30a0}'..='\u{30ff}')
    }

    fn to_katakana(&self) -> char {
        if *self >= '\u{3041}' && *self <= '\u{3096}' {
            char::from_u32(*self as u32 + 96).unwrap()
        } else {
            *self
        }
    }
}
