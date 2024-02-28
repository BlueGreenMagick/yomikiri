use csv;
use std::collections::HashSet;
use std::error::Error;
use std::path::Path;
use std::{cmp, fs};
use yomikiri_dictionary::parse_json_file;
use yomikiri_dictionary_types::{Entry, PartOfSpeech};

type TResult<T> = core::result::Result<T, Box<dyn Error>>;

struct LexItem {
    surface: String,
    lid: String,
    rid: String,
    cost: String,
    base: String,
    reading: String,
    pos: String,
    pos2: String,
    conj_form: String,
}

impl LexItem {
    // 1. For each form:
    //     for each sense:
    //         if sense.to_form is empty or form in sense.to_form:
    //             create LexItem
    // 2. For each reading:
    //     if reading.nokanji or forms is empty:
    //         for each sense:
    //             if sense.to_reading is empty or reading in sense.to_reading:
    //                 create LexItem
    fn items_from_entry(entry: &Entry) -> Vec<LexItem> {
        let mut items = vec![];
        let base = entry.main_form();

        for form in &entry.forms {
            // some forms don't have associated reading. e.g. 気持ち好い
            let reading = match entry.reading_for_form(&form.form) {
                Some(r) => r,
                None => continue,
            };
            let cost = cmp::min(
                7000 + 1000 * reading.reading.chars().count(),
                i16::MAX as usize,
            );

            for sense in &entry.senses {
                if !sense.to_form.is_empty() && !sense.to_form.contains(&form.form) {
                    continue;
                }
                for pos in &sense.pos {
                    let item = LexItem {
                        surface: form.form.clone(),
                        lid: "0".into(),
                        rid: "0".into(),
                        cost: cost.to_string(),
                        base: base.clone(),
                        reading: reading.reading.clone(),
                        pos: part_of_speech_to_unidic(pos).into(),
                        pos2: "*".into(),
                        conj_form: "*".into(),
                    };
                    items.push(item);
                }
            }
        }

        for reading in &entry.readings {
            if !reading.nokanji && !entry.forms.is_empty() {
                continue;
            }
            let cost = cmp::min(
                4000 + 1000 * reading.reading.chars().count(),
                i16::MAX as usize,
            );
            for sense in &entry.senses {
                if !sense.to_reading.is_empty() && !sense.to_reading.contains(&reading.reading) {
                    continue;
                }
                for pos in &sense.pos {
                    let item = LexItem {
                        surface: reading.reading.clone(),
                        lid: "0".into(),
                        rid: "0".into(),
                        cost: cost.to_string(),
                        base: base.clone(),
                        reading: reading.reading.clone(),
                        pos: part_of_speech_to_unidic(pos).into(),
                        pos2: "*".into(),
                        conj_form: "*".into(),
                    };
                    items.push(item);
                }
            }
        }
        items
    }

    fn to_record(&self) -> [&str; 9] {
        [
            &self.surface,
            &self.lid,
            &self.rid,
            &self.cost,
            &self.pos,
            &self.pos2,
            &self.conj_form,
            &self.reading,
            &self.base,
        ]
    }
}

/// Transforms files in `input_dir` and put it into `transform_dir`.
///
/// yomikiridict files are required in `resource_dir`
pub fn transform(input_dir: &Path, transform_dir: &Path, resource_dir: &Path) -> TResult<()> {
    let entries = fs::read_dir(input_dir)?;
    for entry in entries {
        let entry = entry?;
        let copy_from = entry.path();
        if let Some(file_name) = copy_from.file_name() {
            let copy_to = transform_dir.join(&file_name);
            let file_name = file_name.to_str().unwrap();
            match file_name {
                "lex_naist.csv" => {
                    transform_lex(
                        &copy_from,
                        transform_dir,
                        &resource_dir.join("english.yomikiriindex"),
                        &resource_dir.join("english.yomikiridict"),
                    )?;
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
/// 3. Add entries from JMDict that is not in unidic
fn transform_lex(
    lex_path: &Path,
    output_dir: &Path,
    index_path: &Path,
    dict_path: &Path,
) -> TResult<()> {
    let mut items: Vec<LexItem> = Vec::with_capacity(1500000);

    let mut reader = csv::Reader::from_path(lex_path)?;
    let iter = reader.records();
    // remove emojis and single characters
    let iter = iter.skip(2977);

    for record in iter {
        let record = record?;

        let mut item = LexItem {
            surface: record.get(0).unwrap().into(),
            lid: record.get(1).unwrap().into(),
            rid: record.get(2).unwrap().into(),
            cost: record.get(3).unwrap().into(),
            pos: record.get(4).unwrap().into(),
            pos2: record.get(5).unwrap().into(),
            reading: record.get(24).unwrap().into(),
            base: record.get(11).unwrap().into(),
            conj_form: record.get(9).unwrap().into(),
        };

        // remove info in base e.g.　「私-代名詞」　「アイアコス-Aeacus」
        if let Some((front, _)) = item.base.split_once('-') {
            item.base = front.into();
        }
        items.push(item);
    }

    let jmdict_entries = parse_json_file(index_path, dict_path)?;
    add_words_in_jmdict(&mut items, &jmdict_entries)?;
    let removed = remove_word_not_in_jmdict(&mut items, &jmdict_entries)?;

    // write removed items for debugging purposes
    // .hidden is attached so lindera does not add it to its dictionary
    let removed_lex_path = output_dir.join("removed.csv.hidden");
    let mut writer = csv::Writer::from_path(&removed_lex_path)?;
    for item in removed {
        writer.write_record(&item.to_record())?;
    }

    let output_lex_path = output_dir.join("lex.csv");
    let mut writer = csv::Writer::from_path(&output_lex_path)?;
    for item in items {
        writer.write_record(&item.to_record())?;
    }

    // retain only useful fields

    Ok(())
}

/// Add words in JMDict that is not in Unidic lex
/// and is not an expression
/// e.g. katakana words
fn add_words_in_jmdict(items: &mut Vec<LexItem>, entries: &Vec<Entry>) -> TResult<()> {
    let mut item_bases: HashSet<String> = HashSet::with_capacity(items.len() * 2);
    for i in items.iter() {
        item_bases.insert(i.base.clone());
    }

    for entry in entries {
        if entry.is_expression() {
            continue;
        }
        if entry_form_in_item_bases(&item_bases, &entry) {
            continue;
        }
        let new_items = LexItem::items_from_entry(&entry);
        for item in &new_items {
            item_bases.insert(item.base.clone());
        }
        items.extend(new_items);
    }
    Ok(())
}

/// Remove LexItems whose base or surface is not in JMDict.
/// Returns removed LexItems.
fn remove_word_not_in_jmdict(
    items: &mut Vec<LexItem>,
    entries: &Vec<Entry>,
) -> TResult<Vec<LexItem>> {
    let mut terms: HashSet<&str> = HashSet::with_capacity(entries.len() * 4);
    for entry in entries {
        for term in entry.terms() {
            terms.insert(term);
        }
    }

    let mut retain_len = 0_usize;
    for i in 0..items.len() {
        let item = &items[i];
        if terms.contains(item.base.as_str()) || terms.contains(item.surface.as_str()) {
            items.swap(i, retain_len);
            retain_len += 1;
        }
    }
    let removed = items.split_off(retain_len);
    Ok(removed)
}

fn entry_form_in_item_bases(item_bases: &HashSet<String>, entry: &Entry) -> bool {
    for form in &entry.forms {
        if item_bases.contains(&form.form) {
            return true;
        }
    }
    for reading in &entry.readings {
        if item_bases.contains(&reading.reading) {
            return true;
        }
    }
    return false;
}

fn part_of_speech_to_unidic(pos: &PartOfSpeech) -> &'static str {
    match pos {
        PartOfSpeech::Noun => "名詞",
        PartOfSpeech::Verb => "動詞",
        PartOfSpeech::Adjective => "形容詞",
        PartOfSpeech::NaAdjective => "形状詞",
        PartOfSpeech::Particle => "助詞",
        PartOfSpeech::Adverb => "副詞",
        PartOfSpeech::Interjection => "感動詞",
        PartOfSpeech::Suffix => "接尾辞",
        PartOfSpeech::AuxiliaryVerb => "助動詞",
        PartOfSpeech::Pronoun => "代名詞",
        PartOfSpeech::Conjunction => "接続詞",
        PartOfSpeech::Prefix => "接頭辞",
        PartOfSpeech::Adnomial => "連体詞",
        PartOfSpeech::Expression => "=exp=",
        PartOfSpeech::Unclassified => "",
    }
}
