import { hasOwnProperty } from "./utils";
import ENTITIES from "../assets/dicEntities.json";
import { extractKanjis } from "./japanese";
import type {
  Entry,
  JMSenseMisc,
  PartOfSpeech,
  Rarity,
  Reading,
  WordEntry,
} from "@yomikiri/yomikiri-rs";
import { YomikiriError } from "./error";
export type {
  WordEntry,
  Entry,
  Reading,
  Sense,
  PartOfSpeech,
} from "@yomikiri/yomikiri-rs";

export type DictionaryResult = WordEntry[];

export function getMainForm(entry: Entry): string {
  if (entry.type === "word") {
    return getWordEntryMainForm(entry);
  } else {
    return entry.kanji;
  }
}

function getWordEntryMainForm(entry: WordEntry): string {
  if (entry.kanjis.length > 0) {
    if (entry.kanjis[0].rarity === "normal") {
      return entry.kanjis[0].kanji;
    } else if (entry.readings[0].rarity === "normal") {
      return entry.readings[0].reading;
    } else {
      return entry.kanjis[0].kanji;
    }
  } else {
    return entry.readings[0].reading;
  }
}

export function getMainReading(entry: Entry, mainForm: string): string {
  if (entry.type === "word") {
    return getReadingForForm(entry, mainForm, false).reading;
  } else {
    for (const group of entry.groups) {
      for (const item of group.items) {
        return item.reading;
      }
    }
    return "";
  }
}

/** if `nokanji` is true, include readings that aren't true readings of kanji */
export function getReadingForForm(
  entry: Entry.word,
  form: string,
  nokanji = true,
): Reading {
  for (const reading of entry.readings) {
    if (nokanji && reading.nokanji) continue;
    if (reading.toKanji.length == 0 || reading.toKanji.includes(form)) {
      return reading;
    }
  }
  console.error(
    `WordEntry ${getMainForm(entry)} has no reading for form: ${form}`,
  );
  return entry.readings[0];
}

export function isCommonEntry(entry: WordEntry): boolean {
  return entry.priority >= 100;
}

/** Put in return value of .entityName() */
export function entityInfo(name: string): string | null {
  if (hasOwnProperty(ENTITIES, name)) {
    return ENTITIES[name];
  } else {
    return null;
  }
}

/** Returns entity name if s is an entity, else return null. */
export function entityName(s: string): string | null {
  if (s.length > 2 && s.startsWith("=") && s.endsWith("=") && s[1] !== "=") {
    return s.substring(1, s.length - 1);
  }
  return null;
}

const unidicPosMap: Record<string, PartOfSpeech> = {
  名詞: "noun",
  動詞: "verb",
  形容詞: "adjective",
  形状詞: "na-adjective",
  助詞: "particle",
  副詞: "adverb",
  感動詞: "interjection",
  接尾辞: "suffix",
  助動詞: "auxiliary verb",
  代名詞: "pronoun",
  接続詞: "conjunction",
  接頭辞: "prefix",
  連体詞: "adnomial",
  exp: "expression",
  記号: "noun",
  UNK: "unclassified",
};

/**
 * entry matches token.pos from unidic 2.2.0
 */
export function matchesTokenPos(entry: WordEntry, tokenPos: string): boolean {
  const dictPos: PartOfSpeech | undefined = unidicPosMap[tokenPos];
  if (!(typeof dictPos === "string")) {
    throw Error(`Invalid part-of-speech in token: ${tokenPos}`);
  }

  for (const group of entry.groupedSenses) {
    if (group.pos.includes(dictPos)) {
      return true;
    }
  }
  return false;
}

/**
 * Returns a list of entries valid for token surface.
 * If no entries are valid, return a copy of `entries`.
 *
 * A valid entry has a term that contain all the kanji of surface.
 */
// Example where no entries are valid: {surface: 辞める, base: 止める}
// jmdict considers 辞める and 止める as separate word,
// but unidic considers 辞める as variant of 止める.
export function getValidEntriesForSurface(
  entries: Entry[],
  surface: string,
): Entry[] {
  const kanjis = extractKanjis(surface);
  if (kanjis === "") {
    return [...entries];
  }

  const validEntries: Entry[] = [];
  for (const entry of entries) {
    if (entry.type == "name") {
      validEntries.push(entry);
      continue;
    }

    for (const kanjiForm of entry.kanjis) {
      let containsAll = true;
      for (const kanji of kanjis) {
        if (!kanjiForm.kanji.includes(kanji)) {
          containsAll = false;
          break;
        }
      }
      if (containsAll) {
        validEntries.push(entry);
        break;
      }
    }
  }

  // show less correct entries if all entries are invalid
  if (validEntries.length == 0) {
    return [...entries];
  } else {
    return validEntries;
  }
}

export interface Writing {
  writing: string;
  rarity: Rarity;
}

export interface EntryOtherForms {
  writings: Writing[];
  readings: Reading[];
}

/**
 * Returns non-search forms and readings
 * Returns null if there are no other forms or readings in entry
 */
export function getOtherFormsInEntry(
  entry: Entry.word,
): EntryOtherForms | null {
  const writings: Writing[] = [];
  const readings: Reading[] = [];

  const mainForm = getMainForm(entry);
  const mainReading = getReadingForForm(entry, mainForm);

  for (const kanji of entry.kanjis) {
    if (kanji.kanji !== mainForm && kanji.rarity !== "search") {
      writings.push({
        writing: kanji.kanji,
        rarity: kanji.rarity,
      });
    }
  }
  for (const reading of entry.readings) {
    if (
      reading.reading !== mainReading.reading &&
      reading.rarity !== "search"
    ) {
      if (reading.nokanji) {
        writings.push({
          writing: reading.reading,
          rarity: reading.rarity,
        });
      } else {
        readings.push(reading);
      }
    }
  }

  writings.sort((a, b) => orderRarity(a.rarity, b.rarity));
  readings.sort((a, b) => orderRarity(a.rarity, b.rarity));

  if (writings.length === 0 && readings.length === 0) {
    return null;
  } else {
    return {
      writings,
      readings,
    };
  }
}

function rarityEnumValue(rarity: Rarity): number {
  if (rarity === "normal") {
    return 0;
  } else if (rarity === "rare") {
    return 1;
  } else if (rarity === "outdated") {
    return 2;
  } else if (rarity === "incorrect") {
    return 3;
  } else if (rarity === "search") {
    return 4;
  } else {
    throw new YomikiriError(`Unknown rarity: ${rarity}`);
  }
}

function orderRarity(a: Rarity, b: Rarity): number {
  if (a == b) {
    return 0;
  }
  return rarityEnumValue(a) - rarityEnumValue(b);
}

const MISC_DISPLAY: { [Key in JMSenseMisc]: string } = {
  abbreviation: "abbreviation",
  archaic: "archaic",
  character: "character",
  children: "children",
  colloquial: "colloquial",
  company: "company",
  creature: "creature",
  datedTerm: "dated",
  deity: "deity",
  derogatory: "derogatory",
  document: "document",
  euphemistic: "euphemistic",
  event: "event",
  familiar: "familiar",
  female: "female",
  fiction: "fiction",
  formalTerm: "formal",
  forename: "forename",
  group: "group",
  historicalTerm: "historical",
  honorific: "honorific",
  humble: "humble",
  idiomatic: "idiomatic",
  jocular: "jocular",
  legend: "legend",
  mangaSlang: "manga slang",
  male: "male",
  mythology: "mythology",
  internetSlang: "internet slang",
  object: "object",
  obsolete: "obsolete",
  onomatopoeic: "onomatopoeic",
  organization: "organization",
  other: "other",
  person: "person",
  place: "place",
  poetical: "poetical",
  polite: "polite",
  product: "product",
  proverb: "proverb",
  quotation: "quotation",
  rare: "rare",
  religion: "religion",
  sensitive: "sensitive",
  service: "service",
  ship: "ship",
  slang: "slang",
  railway: "railway",
  surname: "surname",
  usuallyKanaAlone: "written using kana",
  unclassified: "unclassified",
  vulgar: "vulgar",
  artwork: "artwork",
  rudeTerm: "rude term",
  yojijukugo: "yojijukugo",
};

/** Returns misc text to be displayed */
export function miscDisplayText(misc: JMSenseMisc): string {
  // convert misc that is in camel case, to whitespace separated string
  return MISC_DISPLAY[misc];
}
