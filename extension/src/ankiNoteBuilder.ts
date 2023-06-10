import Config from "./config";
import type { ScanResult } from "./content/scanner";
import type { Entry, Sense } from "./dictionary";

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
  const _markerHandlers: {
    [marker: string]: (data: MarkerData) => string;
  } = {};
  let _cachedValue: { [marker: string]: string } = {};

  export function addMarker(marker: string, fn: (data: MarkerData) => string) {
    _markerHandlers[marker] = fn;
  }

  function markerValue(data: MarkerData, marker: string): string {
    if (_cachedValue[marker] !== undefined) return _cachedValue[marker];

    const handler = _markerHandlers[marker];
    let value = "";
    if (handler !== undefined) {
      value = handler(data);
    } else {
      console.error(`Invalid marker in Anki note template: {{${marker}}}`);
    }
    _cachedValue[marker] = value;
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
    _cachedValue = {};
    const templates = await Config.get("anki.templates");
    const template = templates[0];
    const note = cloneNote(template);
    for (const field of note.fields) {
      console.log(field.value);
      field.value = field.value.replace(
        /{{([^{}<>\s]+)}}/g,
        (match, marker) => {
          return markerValue(data, marker);
        }
      );
    }
    return note;
  }
}

AnkiNoteBuilder.addMarker("word-original", (data: MarkerData) => {
  return data.scanned.token.text;
});
AnkiNoteBuilder.addMarker("word-dict", (data: MarkerData) => {
  return data.scanned.token.baseForm;
});
AnkiNoteBuilder.addMarker("word-reading", (data: MarkerData) => {
  return data.scanned.token.reading;
});
AnkiNoteBuilder.addMarker("sentence-original", (data: MarkerData) => {
  return data.scanned.sentence;
});
AnkiNoteBuilder.addMarker("sentence-reading", (data: MarkerData) => {
  let reading = "";
  for (const token of data.scanned.sentenceTokens) {
    reading += token.reading;
  }
  return reading;
});
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
