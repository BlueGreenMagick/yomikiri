import Config from "./config";
import type { ScanResult } from "./content/scanner";
import { Entry, type Sense } from "./dicEntry";
import { RubyString } from "./japanese";

export interface MarkerData {
  scanned: ScanResult;
  entry: Entry;
  selectedMeaning?: Sense;
}

export interface Field {
  name: string;
  value: string;
}

export interface NoteData {
  deck: string;
  notetype: string;
  fields: Field[];
  tags: string;
}

export namespace AnkiNoteBuilder {
  export const MARKERS = [
    "",
    "word",
    "word-furigana",
    "word-kana",
    "dict",
    "dict-furigana",
    "sentence",
    "sentence-furigana",
    "sentence-kana",
  ] as const;
  export type Marker = (typeof MARKERS)[number];

  const _markerHandlers: {
    [marker: string]: (data: MarkerData) => string;
  } = {};

  export function addMarker(marker: Marker, fn: (data: MarkerData) => string) {
    _markerHandlers[marker] = fn;
  }

  export function markerValue(marker: string, data: MarkerData): string {
    const handler = _markerHandlers[marker];
    let value = "";
    if (handler !== undefined) {
      value = handler(data);
    } else {
      console.error(`Invalid marker in Anki note template: {{${marker}}}`);
    }
    return value;
  }

  function cloneNote(n: NoteData): NoteData {
    const note: NoteData = {
      ...n,
      fields: [],
    };
    for (const field of n.fields) {
      note.fields.push({
        ...field,
      });
    }
    return note;
  }

  export async function buildNote(data: MarkerData): Promise<NoteData> {
    const templates = await Config.get("anki.templates");
    const template = templates[0];
    const note = cloneNote(template);
    for (const field of note.fields) {
      const marker = field.value;
      field.value = markerValue(marker, data);
    }
    return note;
  }

  addMarker("", (_data: MarkerData) => {
    return "";
  });
  addMarker("word", (data: MarkerData) => {
    return data.scanned.token.text;
  });
  addMarker("word-kana", (data: MarkerData) => {
    return data.scanned.token.reading;
  });
  addMarker("word-furigana", (data: MarkerData) => {
    let rubies = RubyString.generate(
      data.scanned.token.text,
      data.scanned.token.reading
    );
    return RubyString.toAnki(rubies);
  });
  addMarker("dict", (data: MarkerData) => {
    return data.scanned.token.baseForm;
  });
  addMarker("dict-furigana", (data: MarkerData) => {
    const form = data.scanned.token.baseForm;
    const reading = Entry.readingForForm(data.entry, form, false).reading;
    const rubies = RubyString.generate(form, reading);
    return RubyString.toAnki(rubies);
  });
  addMarker("sentence", (data: MarkerData) => {
    return data.scanned.sentence;
  });
  addMarker("sentence-furigana", (data: MarkerData) => {
    let rubies: RubyString = [];
    for (const token of data.scanned.sentenceTokens) {
      rubies.push(...RubyString.generate(token.text, token.reading));
    }
    return RubyString.toAnki(rubies);
  });
  addMarker("sentence-kana", (data: MarkerData) => {
    let reading = "";
    for (const token of data.scanned.sentenceTokens) {
      reading += token.reading;
    }
    return reading;
  });
}

/*
Dropdown menu:
| sentence > | original |
             | furigana |
             | reading  |
             
| word     > | original |
             | dict    |
             | reading  |
             | original-furigana |
             | dict-furigana |

| translation |
| cloze |
| meaning  > | selected |
             | full  | full meanings 
             | short | if on specific, first 2. Otherwise first 3

| url |



For 'sentence' does it bold word, or wrap it in a span? 
Do I add an option for that as well?

Options
1. selection in sentence: <b>{{selection}}</b>
2. translation service: google translate
3. furigana mode: plain / html (plain: 日本語[にほんご])
4. 

*/
