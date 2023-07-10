import Utils from "./utils";
import ENTITIES from "./assets/dicEntities.json";

// list of tuple (pos sorted list, senses)
export interface GroupedSense {
  pos: string[];
  senses: Sense[];
}
export type DictionaryResult = Entry[];

export interface Entry {
  /** searchable terms  */
  terms: string[];
  forms: Form[];
  readings: Reading[];
  senses: Sense[];
  priority: number;
  /** if retrieved from db */
  id?: number;
}

export namespace Entry {
  export function fromObject(obj: any): Entry {
    let terms = obj.terms;
    const forms = [];
    const readings = [];
    const senses = [];
    const priority = obj.p ?? obj.priority ?? 0;
    for (const form of obj.f ?? obj.forms ?? []) {
      forms.push(Form.fromObject(form));
    }
    for (const reading of obj.r ?? obj.readings ?? []) {
      readings.push(Reading.fromObject(reading));
    }
    for (const sense of obj.s ?? obj.senses ?? []) {
      senses.push(Sense.fromObject(sense));
    }
    if (terms === undefined) {
      terms = [];
      for (const form of forms) {
        terms.push(form.form);
      }
      for (const reading of readings) {
        terms.push(reading.reading);
      }
    }
    return {
      terms,
      forms,
      readings,
      senses,
      priority,
    };
  }

  export function mainForm(entry: Entry): string {
    if (entry.forms.length > 0) {
      return entry.forms[0].form;
    } else {
      return entry.readings[0].reading;
    }
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

  export function isCommon(entry: Entry): boolean {
    return entry.priority >= 100;
  }

  /** Put in return value of .entityName() */
  export function entityInfo(name: string): string | null {
    let info = ENTITIES[name] as string | undefined;
    if (info === undefined) return null;
    return info;
  }

  /** Returns entity name if s is an entity, else return null. */
  export function entityName(s: string): string | null {
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

export interface Form {
  form: string;
  // not a commonly used form
  uncommon: boolean;
  info: string[];
}

export namespace Form {
  export function fromObject(obj: any): Form {
    return {
      form: obj.f ?? obj.form ?? "",
      uncommon: obj.u ?? obj.uncommon ?? false,
      info: obj.i ?? obj.info ?? [],
    };
  }
}

export interface Reading {
  reading: string;
  nokanji: boolean;
  uncommon: boolean;
  toForm: string[];
  info: string[];
}

export namespace Reading {
  export function fromObject(obj: any): Reading {
    return {
      reading: obj.r ?? obj.reading ?? "",
      nokanji: obj.nk ?? obj.nokanji ?? false,
      uncommon: obj.u ?? obj.uncommon ?? false,
      toForm: obj.tf ?? obj.toForm ?? [],
      info: obj.i ?? obj.info ?? [],
    };
  }
}

export interface Sense {
  toForm: string[];
  toReading: string[];
  pos: string[];
  misc: string[];
  info: string[];
  dialect: string[];
  meaning: string[];
}

export namespace Sense {
  export function fromObject(obj: any): Sense {
    return {
      toForm: obj.tf ?? obj.toForm ?? [],
      toReading: obj.tr ?? obj.toReading ?? [],
      pos: (obj.p ?? obj.partOfSpeech ?? []).map(parsePos),
      misc: obj.mc ?? obj.misc ?? [],
      info: obj.i ?? obj.info ?? [],
      dialect: obj.d ?? obj.dialect ?? [],
      meaning: obj.m ?? obj.meaning ?? [],
    };
  }

  const tinyPosMap: { [key: string]: string } = {
    n: "noun",
    v: "verb",
    a: "adjective",
    p: "particle",
    av: "adverb",
    ax: "auxiliary",
    cj: "conjunction",
    cp: "copula",
    pn: "pronoun",
    nm: "numeric",
    pf: "prefix",
    sf: "suffix",
    cn: "counter",
    in: "interjection",
    e: "expression",
    u: "unclassified",
  };

  function parsePos(tinyPos: string): string {
    return tinyPosMap[tinyPos];
  }
}
