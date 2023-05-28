import pako from "pako";

import Utils from "~/utils";

// list of tuple (pos sorted list, senses)
export type GroupedSense = [string[], Sense[]];

export type DictionaryResult = Entry[];
export interface Entry {
  forms: Form[];
  readings: Reading[];
  senses: Sense[];
}

const ENTITIES: { [key: string]: string } = {
  MA: "martial arts term",
  X: "rude or X-rated term (not displayed in educational software)",
  abbr: "abbreviation",
  "adj-i": "adjective (keiyoushi)",
  "adj-ix": "adjective (keiyoushi) - yoi/ii class",
  "adj-na": "adjectival nouns or quasi-adjectives (keiyodoshi)",
  "adj-no": "nouns which may take the genitive case particle `no'",
  "adj-pn": "pre-noun adjectival (rentaishi)",
  "adj-t": "`taru' adjective",
  "adj-f": "noun or verb acting prenominally",
  adv: "adverb (fukushi)",
  "adv-to": "adverb taking the `to' particle",
  arch: "archaism",
  ateji: "ateji (phonetic) reading",
  aux: "auxiliary",
  "aux-v": "auxiliary verb",
  "aux-adj": "auxiliary adjective",
  Buddh: "Buddhist term",
  chem: "chemistry term",
  chn: "children's language",
  col: "colloquialism",
  comp: "computer terminology",
  conj: "conjunction",
  "cop-da": "copula",
  ctr: "counter",
  derog: "derogatory",
  eK: "exclusively kanji",
  ek: "exclusively kana",
  exp: "expressions (phrases, clauses, etc.)",
  fam: "familiar language",
  fem: "female term or language",
  food: "food term",
  geom: "geometry term",
  gikun: "gikun (meaning as reading) or jukujikun (special kanji reading)",
  hon: "honorific or respectful (sonkeigo) language",
  hum: "humble (kenjougo) language",
  iK: "word containing irregular kanji usage",
  id: "idiomatic expression",
  ik: "word containing irregular kana usage",
  int: "interjection (kandoushi)",
  io: "irregular okurigana usage",
  iv: "irregular verb",
  ling: "linguistics terminology",
  "m-sl": "manga slang",
  male: "male term or language",
  "male-sl": "male slang",
  math: "mathematics",
  mil: "military",
  n: "noun (common) (futsuumeishi)",
  "n-adv": "adverbial noun (fukushitekimeishi)",
  "n-suf": "noun, used as a suffix",
  "n-pref": "noun, used as a prefix",
  "n-t": "noun (temporal) (jisoumeishi)",
  num: "numeric",
  oK: "word containing out-dated kanji",
  obs: "obsolete term",
  obsc: "obscure term",
  ok: "out-dated or obsolete kana usage",
  oik: "old or irregular kana form",
  "on-mim": "onomatopoeic or mimetic word",
  pn: "pronoun",
  poet: "poetical term",
  pol: "polite (teineigo) language",
  pref: "prefix",
  proverb: "proverb",
  prt: "particle",
  physics: "physics terminology",
  rare: "rare",
  sens: "sensitive",
  sl: "slang",
  suf: "suffix",
  uK: "word usually written using kanji alone",
  uk: "word usually written using kana alone",
  unc: "unclassified",
  yoji: "yojijukugo",
  v1: "Ichidan verb",
  "v1-s": "Ichidan verb - kureru special class",
  "v2a-s": "Nidan verb with 'u' ending (archaic)",
  v4h: "Yodan verb with `hu/fu' ending (archaic)",
  v4r: "Yodan verb with `ru' ending (archaic)",
  v5aru: "Godan verb - -aru special class",
  v5b: "Godan verb with `bu' ending",
  v5g: "Godan verb with `gu' ending",
  v5k: "Godan verb with `ku' ending",
  "v5k-s": "Godan verb - Iku/Yuku special class",
  v5m: "Godan verb with `mu' ending",
  v5n: "Godan verb with `nu' ending",
  v5r: "Godan verb with `ru' ending",
  "v5r-i": "Godan verb with `ru' ending (irregular verb)",
  v5s: "Godan verb with `su' ending",
  v5t: "Godan verb with `tsu' ending",
  v5u: "Godan verb with `u' ending",
  "v5u-s": "Godan verb with `u' ending (special class)",
  v5uru: "Godan verb - Uru old class verb (old form of Eru)",
  vz: "Ichidan verb - zuru verb (alternative form of -jiru verbs)",
  vi: "intransitive verb",
  vk: "Kuru verb - special class",
  vn: "irregular nu verb",
  vr: "irregular ru verb, plain form ends with -ri",
  vs: "noun or participle which takes the aux. verb suru",
  "vs-c": "su verb - precursor to the modern suru",
  "vs-s": "suru verb - special class",
  "vs-i": "suru verb - irregular",
  kyb: "Kyoto-ben",
  osb: "Osaka-ben",
  ksb: "Kansai-ben",
  ktb: "Kantou-ben",
  tsb: "Tosa-ben",
  thb: "Touhoku-ben",
  tsug: "Tsugaru-ben",
  kyu: "Kyuushuu-ben",
  rkb: "Ryuukyuu-ben",
  nab: "Nagano-ben",
  hob: "Hokkaido-ben",
  vt: "transitive verb",
  vulg: "vulgar expression or word",
  "adj-kari": "`kari' adjective (archaic)",
  "adj-ku": "`ku' adjective (archaic)",
  "adj-shiku": "`shiku' adjective (archaic)",
  "adj-nari": "archaic/formal form of na-adjective",
  "n-pr": "proper noun",
  "v-unspec": "verb unspecified",
  v4k: "Yodan verb with `ku' ending (archaic)",
  v4g: "Yodan verb with `gu' ending (archaic)",
  v4s: "Yodan verb with `su' ending (archaic)",
  v4t: "Yodan verb with `tsu' ending (archaic)",
  v4n: "Yodan verb with `nu' ending (archaic)",
  v4b: "Yodan verb with `bu' ending (archaic)",
  v4m: "Yodan verb with `mu' ending (archaic)",
  "v2k-k": "Nidan verb (upper class) with `ku' ending (archaic)",
  "v2g-k": "Nidan verb (upper class) with `gu' ending (archaic)",
  "v2t-k": "Nidan verb (upper class) with `tsu' ending (archaic)",
  "v2d-k": "Nidan verb (upper class) with `dzu' ending (archaic)",
  "v2h-k": "Nidan verb (upper class) with `hu/fu' ending (archaic)",
  "v2b-k": "Nidan verb (upper class) with `bu' ending (archaic)",
  "v2m-k": "Nidan verb (upper class) with `mu' ending (archaic)",
  "v2y-k": "Nidan verb (upper class) with `yu' ending (archaic)",
  "v2r-k": "Nidan verb (upper class) with `ru' ending (archaic)",
  "v2k-s": "Nidan verb (lower class) with `ku' ending (archaic)",
  "v2g-s": "Nidan verb (lower class) with `gu' ending (archaic)",
  "v2s-s": "Nidan verb (lower class) with `su' ending (archaic)",
  "v2z-s": "Nidan verb (lower class) with `zu' ending (archaic)",
  "v2t-s": "Nidan verb (lower class) with `tsu' ending (archaic)",
  "v2d-s": "Nidan verb (lower class) with `dzu' ending (archaic)",
  "v2n-s": "Nidan verb (lower class) with `nu' ending (archaic)",
  "v2h-s": "Nidan verb (lower class) with `hu/fu' ending (archaic)",
  "v2b-s": "Nidan verb (lower class) with `bu' ending (archaic)",
  "v2m-s": "Nidan verb (lower class) with `mu' ending (archaic)",
  "v2y-s": "Nidan verb (lower class) with `yu' ending (archaic)",
  "v2r-s": "Nidan verb (lower class) with `ru' ending (archaic)",
  "v2w-s":
    "Nidan verb (lower class) with `u' ending and `we' conjugation (archaic)",
  archit: "architecture term",
  astron: "astronomy, etc. term",
  baseb: "baseball term",
  biol: "biology term",
  bot: "botany term",
  bus: "business term",
  econ: "economics term",
  engr: "engineering term",
  finc: "finance term",
  geol: "geology, etc. term",
  law: "law, etc. term",
  mahj: "mahjong term",
  med: "medicine, etc. term",
  music: "music term",
  Shinto: "Shinto term",
  shogi: "shogi term",
  sports: "sports term",
  sumo: "sumo term",
  zool: "zoology term",
  joc: "jocular, humorous term",
  anat: "anatomical term",
};

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
