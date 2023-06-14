import pako from "pako";
import Dexie from "dexie";
import Utils from "~/utils";
import ENTITIES from "./assets/dicEntities.json";
import EnJMDict from "./assets/jmdict/en.json.gz";

/*
An entry can contain 0+ form, 1+ reading, and 1+ sense.

A reading can contain 0+ to_form. If 0, the reading is applied to all forms. 
If nokanji, it is associated with forms, but are not the true readings of the forms.
Else, only to specified forms.

A sense can contain 0+ to_reading, and 0+ to_form.

*/

// list of tuple (pos sorted list, senses)
export type GroupedSense = [string[], Sense[]];

export type DictionaryResult = Entry[];

// db schema version
const DB_VER = 1;
// dictionary schema version
const DIC_VER = 1;

interface Config {
  name: string;
  value: any;
}

export class Dictionary {
  db: Dexie;

  private constructor() {
    this.db = new Dexie("Dictionary");
    this.setupDB();
  }

  private static async downloadFromUrl(url: string): Promise<Entry[]> {
    const resp = await fetch(url);
    const data = await resp.arrayBuffer();
    const unzipped = pako.ungzip(data, { to: "string" }) as string;
    const entryObjects = JSON.parse(unzipped) as any[];
    return entryObjects.map(Entry.fromObject);
  }

  private setupDB() {
    // Should we use multi-valued keys instead of sql-like many-to-many?
    this.db.version(DB_VER).stores({
      entries: "++id, *terms",
      config: "&name",
    });
  }

  private async install(url: string): Promise<void> {
    Utils.bench("Installing dictionary");
    const db = this.db;
    const entries = await Dictionary.downloadFromUrl(url);
    await db.transaction("rw", "entries", "config", async () => {
      await db.table("config").put({ name: "dic_ver", value: DIC_VER });
      await db.table("config").put({ name: "dic_name", value: "English" });
      await db.table("entries").clear();
      await db.table("entries").bulkAdd(entries);
    });
    Utils.bench("Installed dictionary");
  }

  private async getConfig(name: string): Promise<any> {
    return await this.db.table("config").get(name);
  }

  static async initialize(): Promise<Dictionary> {
    const dic = new Dictionary();
    const dic_ver = await dic.getConfig("dic_ver");
    if (!(typeof dic_ver === "object" && dic_ver.value === DIC_VER)) {
      await dic.install(EnJMDict);
    }
    return dic;
  }

  async search(term: string): Promise<Entry[]> {
    return await this.db.table("entries").where("terms").equals(term).toArray();
  }

  async hasStartsWith(
    term: string,
    filter?: (entry: Entry) => boolean
  ): Promise<boolean> {
    if (!filter) {
      filter = (e: Entry) => true;
    }
    const entry = await this.db
      .table("entries")
      .where("terms")
      .startsWith(term)
      .distinct()
      .filter(filter)
      .first();
    return entry !== undefined;
  }

  /** Put in return value of .entityName() */
  static entityInfo(entity: string): string | null {
    let name = Dictionary.entityName(entity);
    if (name === null) return null;
    let info = ENTITIES[name] as string | undefined;
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
}

export interface Entry {
  /** searchable terms  */
  terms: string[];
  forms: Form[];
  readings: Reading[];
  senses: Sense[];
  /** if retrieved from db */
  id?: number;
}

export namespace Entry {
  export function fromObject(obj: any): Entry {
    const terms = [];
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
    for (const form of forms) {
      terms.push(form.form);
    }
    for (const reading of readings) {
      terms.push(reading.reading);
    }
    return {
      terms,
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

  /** if `nokanji` is true, include readings that aren't true readings of kanji */
  export function readingForForm(
    entry: Entry,
    form: string,
    nokanji: boolean = true
  ): Reading {
    for (const reading of entry.readings) {
      if (nokanji && reading.nokanji) continue;
      if (reading.toForm.length == 0 || reading.toForm.includes(form)) {
        return reading;
      }
    }
    console.error(
      `Entry ${Entry.mainForm(entry)} has no reading for form: ${form}`
    );
    return entry.readings[0];
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
