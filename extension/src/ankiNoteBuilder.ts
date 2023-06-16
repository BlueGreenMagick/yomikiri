import Config from "./config";
import type { ScanResult } from "./content/scanner";
import { Entry, type Sense } from "./dicEntry";
import { RubyString } from "./japanese";
import Utils from "./utils";

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
    "dict-kana",
    "sentence",
    "sentence-furigana",
    "sentence-kana",
    "meaning",
    "meaning-full",
    "meaning-short",
    "url",
    "link",
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
    return Utils.escapeHTML(data.scanned.token.text);
  });
  addMarker("word-furigana", (data: MarkerData) => {
    let rubies = RubyString.generate(
      data.scanned.token.text,
      data.scanned.token.reading
    );
    return Utils.escapeHTML(RubyString.toAnki(rubies));
  });
  addMarker("word-kana", (data: MarkerData) => {
    return Utils.escapeHTML(data.scanned.token.reading);
  });

  addMarker("dict", (data: MarkerData) => {
    return Utils.escapeHTML(data.scanned.token.baseForm);
  });
  addMarker("dict-furigana", (data: MarkerData) => {
    const form = data.scanned.token.baseForm;
    const reading = Entry.readingForForm(data.entry, form, false).reading;
    const rubies = RubyString.generate(form, reading);
    return Utils.escapeHTML(RubyString.toAnki(rubies));
  });
  addMarker("dict-kana", (data: MarkerData) => {
    const form = data.scanned.token.baseForm;
    const kana = Entry.readingForForm(data.entry, form, false).reading;
    return Utils.escapeHTML(kana);
  });

  addMarker("sentence", (data: MarkerData) => {
    let sentence = "";
    const tokens = data.scanned.sentenceTokens;
    for (let i = 0; i < data.scanned.tokenIdx; i++) {
      sentence += Utils.escapeHTML(tokens[i].text);
    }
    sentence += "<b>";
    sentence += Utils.escapeHTML(data.scanned.token.text);
    sentence += "</b>";
    for (let i = data.scanned.tokenIdx + 1; i < tokens.length; i++) {
      sentence += Utils.escapeHTML(tokens[i].text);
    }
    return sentence;
  });
  addMarker("sentence-furigana", (data: MarkerData) => {
    let rubies: RubyString = [];
    const tokens = data.scanned.sentenceTokens;
    for (let i = 0; i < data.scanned.tokenIdx; i++) {
      rubies.push(...RubyString.generate(tokens[i].text, tokens[i].reading));
    }
    const before = Utils.escapeHTML(RubyString.toAnki(rubies));

    const tokenRuby = RubyString.generate(
      data.scanned.token.text,
      data.scanned.token.reading
    );
    const tokenString = Utils.escapeHTML(RubyString.toAnki(tokenRuby));
    const mid = "<b>" + tokenString + "</b>";

    rubies = [];
    for (let i = data.scanned.tokenIdx + 1; i < tokens.length; i++) {
      rubies.push(...RubyString.generate(tokens[i].text, tokens[i].reading));
    }
    const after = Utils.escapeHTML(RubyString.toAnki(rubies));
    return before + mid + after;
  });
  addMarker("sentence-kana", (data: MarkerData) => {
    let sentence = "";
    const tokens = data.scanned.sentenceTokens;
    for (let i = 0; i < data.scanned.tokenIdx; i++) {
      sentence += Utils.escapeHTML(tokens[i].reading);
    }
    sentence += "<b>";
    sentence += Utils.escapeHTML(data.scanned.token.reading);
    sentence += "</b>";
    for (let i = data.scanned.tokenIdx + 1; i < tokens.length; i++) {
      sentence += Utils.escapeHTML(tokens[i].reading);
      console.log(Utils.escapeHTML("<" + tokens[i].reading));
    }

    return sentence;
  });

  addMarker("meaning", (data: MarkerData) => {
    if (data.selectedMeaning === undefined) {
      return markerValue("meaning-full", data);
    } else {
      return Utils.escapeHTML(data.selectedMeaning.meaning.join(", "));
    }
  });
  addMarker("meaning-full", (data: MarkerData) => {
    const lines = [];
    const grouped = Entry.groupSenses(data.entry);
    for (const group of grouped) {
      for (const meaning of group[1]) {
        const meaningLine = Utils.escapeHTML(meaning.meaning.join(", "));
        lines.push(`<span class="yk-meaning">${meaningLine}</span>`);
      }
    }
    return lines.join("<br>");
  });
  addMarker("meaning-short", (data: MarkerData) => {
    if (data.selectedMeaning === undefined) {
      let meanings = [];
      const cnt = Math.min(3, data.entry.senses.length);
      for (let i = 0; i < cnt; i++) {
        meanings.push(data.entry.senses[i].meaning[0]);
      }
      return Utils.escapeHTML(meanings.join("; "));
    } else {
      const raw = data.selectedMeaning.meaning.slice(0, 2).join(", ");
      return Utils.escapeHTML(raw);
    }
  });

  addMarker("url", (_data: MarkerData) => {
    return window.location.href;
  });
  addMarker("link", (_data: MarkerData) => {
    const el = document.createElement("a");
    el.textContent = document.title;
    el.href = window.location.href;
    return el.outerHTML;
  });
  // TODO: translation, maybe sentence-cloze
}
