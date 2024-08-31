import Utils, { hasOwnProperty } from "./utils";
import ENTITIES from "../assets/dicEntities.json";
import type { Token } from "@platform/backend";
import { extractKanjis } from "./japanese";
import type {
  Entry,
  PartOfSpeech,
  Reading,
  Sense,
} from "@yomikiri/yomikiri-rs";
export type {
  Entry,
  PartOfSpeech,
  Reading,
  Sense,
} from "@yomikiri/yomikiri-rs";

// list of tuple (pos sorted list, senses)
export interface GroupedSense {
  pos: string[];
  senses: Sense[];
}
export type DictionaryResult = Entry[];

export function getMainForm(entry: Entry): string {
  const form = getFirstNotUncommonForm(entry);
  if (form !== null) {
    return form;
  } else {
    if (entry.forms.length > 0) {
      return entry.forms[0].form;
    } else {
      return entry.readings[0].reading;
    }
  }
}

function getFirstNotUncommonForm(entry: Entry): string | null {
  for (const form of entry.forms) {
    if (!form.uncommon) {
      return form.form;
    }
  }
  for (const reading of entry.readings) {
    if (!reading.uncommon) {
      return reading.reading;
    }
  }

  return null;
}

/** groups senses with same partOfSpeech. Preserves order. */
export function groupSenses(entry: Entry): GroupedSense[] {
  const groups: GroupedSense[] = [];
  for (const sense of entry.senses) {
    insertIntoGroupedSenses(groups, sense);
  }
  return groups;
}

function insertIntoGroupedSenses(groups: GroupedSense[], sense: Sense) {
  const pos = sense.pos;
  const sortedPos = [...pos].sort();
  for (const group of groups) {
    if (Utils.listIsIdentical(group.pos, sortedPos)) {
      group.senses.push(sense);
      return;
    }
  }
  const group: GroupedSense = {
    pos: sortedPos,
    senses: [sense],
  };
  groups.push(group);
}

/** if `nokanji` is true, include readings that aren't true readings of kanji */
export function getReadingForForm(
  entry: Entry,
  form: string,
  nokanji = true,
): Reading {
  for (const reading of entry.readings) {
    if (nokanji && reading.nokanji) continue;
    if (reading.toForm.length == 0 || reading.toForm.includes(form)) {
      return reading;
    }
  }
  console.error(`Entry ${getMainForm(entry)} has no reading for form: ${form}`);
  return entry.readings[0];
}

export function isCommonEntry(entry: Entry): boolean {
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
export function matchesTokenPos(entry: Entry, tokenPos: string): boolean {
  const dictPos: PartOfSpeech | undefined = unidicPosMap[tokenPos];
  if (!(typeof dictPos === "string")) {
    throw Error(`Invalid part-of-speech in token: ${tokenPos}`);
  }

  for (const sense of entry.senses) {
    if (sense.pos.includes(dictPos)) {
      return true;
    }
  }
  return false;
}

/**
 * Returns a separate list of entries valid for token surface.
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
    for (const form of entry.forms) {
      let containsAll = true;
      for (const kanji of kanjis) {
        if (!form.form.includes(kanji)) {
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

/**
 * Order entries in-place.
 *
 * 1. pos: Entries whose pos matches token pos is shown first
 * 2. form: Entry whose main form is base/surface >
 *  entry whose secondary common form is base/surface >
 *  entry whose uncommon form is base/surface
 * 3. priority: Entries with higher priority is shown first
 *
 * If `token` is not specified, sort using priority only.
 *
 */
export function orderEntries(entries: Entry[], token?: Token) {
  if (token === undefined) {
    entries.sort((a, b) => b.priority - a.priority);
  } else {
    entries.sort((a, b) => {
      const aMatchesPos = matchesTokenPos(a, token.pos);
      const bMatchesPos = matchesTokenPos(b, token.pos);
      if (aMatchesPos && !bMatchesPos) {
        return -1;
      } else if (!aMatchesPos && bMatchesPos) {
        return 1;
      } else {
        const aFormScore = formScoreForOrder(a, token);
        const bFormScore = formScoreForOrder(b, token);
        if (aFormScore != bFormScore) {
          return bFormScore - aFormScore;
        } else {
          return b.priority - a.priority;
        }
      }
    });
  }
}

/**
 * Score how well entry form matches token.
 * 3: entry's main form is base/surface
 * 2: entry's secondary common form is base/surface
 * 1: entry's uncommon form is base/surface
 * 0: otherwise
 */
function formScoreForOrder(entry: Entry, token: Token): number {
  const mainForm = getMainForm(entry);
  if (mainForm == token.base || mainForm == token.text) {
    return 3;
  }

  let score = 0;
  for (const form of entry.forms) {
    if (form.form == token.base || form.form == token.text) {
      if (!form.uncommon) {
        return 2;
      }
      score = 1;
    }
  }
  for (const reading of entry.readings) {
    if (reading.reading == token.base || reading.reading == token.text) {
      if (!reading.uncommon) {
        return 2;
      }
      score = 1;
    }
  }

  return score;
}

export interface EntryOtherForms {
  forms: OtherForm[];
  readings: OtherReading[];
}

export interface OtherForm {
  form: string;
  rare: boolean;
}

export interface OtherReading {
  reading: string;
  rare: boolean;
}

/** Returns null if there are no other forms or readings in entry */
export function getOtherFormsInEntry(entry: Entry): EntryOtherForms | null {
  const forms: OtherForm[] = [];
  const readings: OtherReading[] = [];

  const mainForm = getMainForm(entry);
  const mainReading = getReadingForForm(entry, mainForm);

  for (const form of entry.forms) {
    if (form.form !== mainForm) {
      forms.push({
        form: form.form,
        rare: form.uncommon,
      });
    }
  }
  for (const reading of entry.readings) {
    if (reading.reading !== mainReading.reading)
      readings.push({
        reading: reading.reading,
        rare: reading.uncommon,
      });
  }

  if (forms.length === 0 && readings.length === 0) {
    return null;
  } else {
    return {
      forms,
      readings,
    };
  }
}
