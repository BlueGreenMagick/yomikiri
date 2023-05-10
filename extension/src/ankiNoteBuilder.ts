import type { Note } from "./api/anki";
import Config from "./config";
import type { ScanResult } from "./content/scanner";
import { Scanner } from "./content/scanner";
import type { DictionaryResult, Entry, Sense } from "./dictionary";

export interface MarkerData {
  scanned: ScanResult;
  entry: Entry;
  selectedMeaning?: Sense;
}

export class AnkiNoteBuilder {
  private static markerHandlers: {
    [marker: string]: (data: MarkerData) => string;
  } = {};
  private static cachedValue: { [marker: string]: string } = {};

  static addMarker(marker: string, fn: (data: MarkerData) => string) {
    AnkiNoteBuilder.markerHandlers[marker] = fn;
  }

  private static markerValue(data: MarkerData, marker: string): string {
    if (this.cachedValue[marker] !== undefined) return this.cachedValue[marker];

    const handler = AnkiNoteBuilder.markerHandlers[marker];
    let value = "";
    if (handler !== undefined) {
      value = handler(data);
    } else {
      console.error(`Invalid marker in Anki note template: {{${marker}}}`);
    }
    this.cachedValue[marker] = value;
    return value;
  }

  private static cloneNote(n: Note): Note {
    const note: Note = {
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

  static async buildNote(data: MarkerData): Promise<Note> {
    AnkiNoteBuilder.cachedValue = {};
    const templates = await Config.get("anki.templates");
    const template = templates[0];
    const note = AnkiNoteBuilder.cloneNote(template);
    for (const field of note.fields) {
      console.log(field.value);
      field.value = field.value.replace(
        /{{([^{}<>\s]+)}}/g,
        (match, marker) => {
          return AnkiNoteBuilder.markerValue(data, marker);
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
  return data.scanned.token.base_form;
});
AnkiNoteBuilder.addMarker("word-reading", (data: MarkerData) => {
  return data.scanned.token.reading;
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
