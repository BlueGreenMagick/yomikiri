import Utils from "./utils";
import ENTITIES from "./assets/dicEntities.json";

// list of tuple (pos sorted list, senses)
export interface GroupedSense {
  pos: string[];
  simplePos: string[];
  senses: Sense[];
}
export type DictionaryResult = Entry[];

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
    let terms = obj.terms;
    const forms = [];
    const readings = [];
    const senses = [];
    for (const form of obj.forms ?? []) {
      forms.push(Form.fromObject(form));
    }
    for (const reading of obj.readings ?? []) {
      readings.push(Reading.fromObject(reading));
    }
    for (const sense of obj.senses ?? []) {
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
    const simplePoss: string[] = [];
    for (const p of sortedPos) {
      const simplePos = Sense.entityToSimplePos(p);
      if (!simplePoss.includes(simplePos)) {
        simplePoss.push(simplePos);
      }
    }
    for (const group of groups) {
      if (Utils.listIsIdentical(group.pos, sortedPos)) {
        group.senses.push(sense);
        return;
      }
    }
    const group: GroupedSense = {
      pos: sortedPos,
      simplePos: simplePoss,
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

  export function simplePos(sense: Sense): string[] {
    const simplePoss: string[] = [];
    for (const posEntity of sense.partOfSpeech) {
      const simplePos = entityToSimplePos(posEntity);
      if (!simplePoss.includes(simplePos)) {
        simplePoss.push(simplePos);
      }
    }
    return simplePoss;
  }

  const ENTITY_SIMPLE_POS_MAP: { [ent: string]: string } = {
    "=n=": "noun",
    "=n-pref=": "noun",
    "=n-suf=": "noun",
    "=vs=": "noun",
    "=aux-v=": "verb",
    "=aux-adj=": "adjective",
    "=adv=": "adverb",
    "=adv-to=": "adverb",
    "=int=": "interjection",
    "=unc=": "unclassified",
  };

  export function entityToSimplePos(posEntity: string): string {
    if (posEntity in ENTITY_SIMPLE_POS_MAP) {
      return ENTITY_SIMPLE_POS_MAP[posEntity];
    } else if (posEntity.startsWith("=v")) {
      return "verb";
    } else if (posEntity.startsWith("=adj")) {
      return "adjective";
    } else {
      const posName = Entry.entityName(posEntity);
      if (posName === null) {
        throw Error(`Invalid POS entity: ${posEntity}`);
      }
      const val = Entry.entityInfo(posName);
      if (val === null) {
        throw Error(`Invalid POS: ${posName}`);
      }
      return val;
    }
  }
}
