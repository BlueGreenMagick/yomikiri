import pako from "pako";

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
  to_form: string[];
  info: string[];
  priority: string[];

  constructor(obj: any) {
    this.reading = obj.reading ?? "";
    this.nokanji = obj.nokanji ?? false;
    this.to_form = obj.to_form ?? [];
    this.info = obj.info ?? [];
    this.priority = obj.priority ?? [];
  }
}

export class Sense {
  to_form: string[];
  to_reading: string[];
  partOfSpeech: string[];
  reference: string[];
  antonym: string[];
  field: string[];
  misc: string[];
  info: string[];
  dialect: string[];
  meaning: string[];

  constructor(obj: any) {
    this.to_form = obj.to_form ?? [];
    this.to_reading = obj.to_reading ?? [];
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
