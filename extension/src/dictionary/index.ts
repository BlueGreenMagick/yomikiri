import pako from "pako";

import entities from "./entities.json";
import Utils from "~/utils";

// list of tuple (pos sorted list, senses)
export type GroupedSense = [string[], Sense[]];

export type DictionaryResult = Entry[];
export interface Entry {
  forms: Form[];
  readings: Reading[];
  senses: Sense[];
}

export namespace Entry {
  export function fromObject(obj: any): Entry {
    const forms = [];
    const readings = [];
    const senses = [];
    for (const form of obj.forms ?? []) {
      forms.push(Form.fromObject(form));
    }
    for (const reading of obj.readings ?? []) {
      readings.push(Reading.fromObject(reading));
    }
    for (const sense of obj.sense ?? []) {
      senses.push(Sense.fromObject(sense));
    }
    return {
      forms,
      readings,
      senses,
    };
  }

  export function mainForm(entry: Entry): string {
    if (entry.forms.length > 0) {
      return entry.forms[0].form;
    } else {
      return entry.readings[0].reading;
    }
  }

  export function isExpression(entry: Entry): boolean {
    for (const sense of entry.senses) {
      if (sense.partOfSpeech.includes("=exp=")) {
        return true;
      }
    }
    return false;
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

export interface Form {
  form: string;
  info: string[];
  priority: string[];
}

export namespace Form {
  export function fromObject(obj: any): Form {
    return {
      form: obj.form ?? "",
      info: obj.info ?? [],
      priority: obj.priority ?? [],
    };
  }
}

export interface Reading {
  reading: string;
  nokanji: boolean;
  toForm: string[];
  info: string[];
  priority: string[];
}

export namespace Reading {
  export function fromObject(obj: any): Reading {
    return {
      reading: obj.reading ?? "",
      nokanji: obj.nokanji ?? false,
      toForm: obj.toForm ?? [],
      info: obj.info ?? [],
      priority: obj.priority ?? [],
    };
  }
}

export interface Sense {
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
}

export namespace Sense {
  export function fromObject(obj: any): Sense {
    return {
      toForm: obj.toForm ?? [],
      toReading: obj.toReading ?? [],
      partOfSpeech: obj.partOfSpeech ?? [],
      reference: obj.reference ?? [],
      antonym: obj.antonym ?? [],
      field: obj.field ?? [],
      misc: obj.misc ?? [],
      info: obj.info ?? [],
      dialect: obj.dialect ?? [],
      meaning: obj.meaning ?? [],
    };
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
      const entry = Entry.fromObject(entryObject);
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
