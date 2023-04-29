import pako from "pako";

import entities from "./entities.json";
import Utils from "~/utils";

// list of tuple (pos sorted list, senses)
export type GroupedSense = [string[], Sense[]];

export class Entry {
  forms: Form[];
  readings: Reading[];
  sense: Sense[];

  constructor(obj: any) {
    this.forms = [];
    this.readings = [];
    this.sense = [];
    for (const form of obj.forms ?? []) {
      this.forms.push(new Form(form));
    }
    for (const reading of obj.readings ?? []) {
      this.readings.push(new Reading(reading));
    }
    for (const sense of obj.sense ?? []) {
      this.sense.push(new Sense(sense));
    }
  }

  mainForm(): string {
    if (this.forms.length > 0) {
      return this.forms[0].form;
    } else {
      return this.readings[0].reading;
    }
  }

  /** groups senses with same partOfSpeech. Preserves order. */
  groupSenses(): GroupedSense[] {
    const groups: GroupedSense[] = [];
    for (const sense of this.sense) {
      this.insertIntoGroupedSenses(groups, sense);
    }
    return groups;
  }

  private insertIntoGroupedSenses(groups: GroupedSense[], sense: Sense) {
    const pos = sense.partOfSpeech;
    const sortedPos = [...pos].sort();
    for (const group of groups) {
      if (Utils.listIsIdentical(group[0], sortedPos)) {
        group[1].push(sense);
        return;
      }
    }
    const group: [string[], Sense[]] = [sortedPos, [sense]];
    groups.push(group);
  }
}

export class Form {
  form: string;
  info: string[];
  priority: string[];

  constructor(obj: any) {
    this.form = obj.form ?? "";
    this.info = obj.info ?? [];
    this.priority = obj.priority ?? [];
  }
}

export class Reading {
  reading: string;
  nokanji: boolean;
  toForm: string[];
  info: string[];
  priority: string[];

  constructor(obj: any) {
    this.reading = obj.reading ?? "";
    this.nokanji = obj.nokanji ?? false;
    this.toForm = obj.toForm ?? [];
    this.info = obj.info ?? [];
    this.priority = obj.priority ?? [];
  }
}

export class Sense {
  toForm: string[];
  toReading: string[];
  partOfSpeech: string[];
  reference: string[];
  antonym: string[];
  field: string[];
  misc: string[];
  info: string[];
  dialect: string[];
  meaning: string[];

  constructor(obj: any) {
    this.toForm = obj.toForm ?? [];
    this.toReading = obj.toReading ?? [];
    this.partOfSpeech = obj.partOfSpeech ?? [];
    this.reference = obj.reference ?? [];
    this.antonym = obj.antonym ?? [];
    this.field = obj.field ?? [];
    this.misc = obj.misc ?? [];
    this.info = obj.info ?? [];
    this.dialect = obj.dialect ?? [];
    this.meaning = obj.meaning ?? [];
  }
}

export class Dictionary {
  entries: Entry[];
  searchMap: { [key: string]: Entry[] };

  private constructor() {
    this.entries = [];
    this.searchMap = {};
  }

  static async loadFromUrl(url: string): Promise<Dictionary> {
    const resp = await fetch(url);
    const data = await resp.arrayBuffer();
    const unzipped = pako.ungzip(data, { to: "string" }) as string;
    const entryObjects = JSON.parse(unzipped);

    const dictionary = new Dictionary();
    for (const entryObject of entryObjects) {
      const entry = new Entry(entryObject);
      dictionary.entries.push(entry);
    }
    dictionary.generateSearchMap();
    return dictionary;
  }

  search(term: string): Entry[] {
    const result = this.searchMap[term] ?? [];
    return [...result];
  }

  /** Put in return value of .entityName() */
  static entityInfo(entity: string): string | null {
    let name = Dictionary.entityName(entity);
    if (name === null) return null;
    let info = entities[name] as string | undefined;
    if (info === undefined) return null;
    return info;
  }

  /** Returns entity name if s is an entity, else return null. */
  static entityName(s: string): string | null {
    if (
      s.length > 2 &&
      s[0] === "=" &&
      s[s.length - 1] === "=" &&
      s[1] !== "="
    ) {
      return s.substring(1, s.length - 1);
    }
    return null;
  }

  private generateSearchMap() {
    for (const entry of this.entries) {
      const keys: string[] = [];
      for (const form of entry.forms) {
        keys.push(form.form);
      }
      for (const reading of entry.readings) {
        if (!keys.includes(reading.reading)) {
          keys.push(reading.reading);
        }
      }

      for (const key of keys) {
        if (this.searchMap.hasOwnProperty(key)) {
          this.searchMap[key].push(entry);
        } else {
          this.searchMap[key] = [entry];
        }
      }
    }
  }
}
