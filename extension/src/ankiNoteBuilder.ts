import type { TokenizeResult } from "./backend";
import Config from "./config";
import { Entry, type Sense } from "./dicEntry";
import { RubyString } from "./japanese";
import { translate } from "./translate";
import Utils from "./utils";

/** This data is saved in the history */
export interface MarkerData {
  tokenized: TokenizeResult;
  entry: Entry;
  selectedMeaning?: Sense;
  /** NFC normalized string */
  sentence: string;
  /** window.location.href */
  url: string;
  /** document.title */
  pageTitle: string;
}

export interface Field {
  name: string;
  value: string;
}

export interface LoadingField {
  name: string;
  value: string | Utils.PromiseWithProgress<string, string>;
}

export interface LoadingNoteData {
  deck: string;
  notetype: string;
  fields: (LoadingField | Field)[];
  tags: string;
}

export interface NoteData extends LoadingNoteData {
  fields: Field[];
}

export type MarkerHandler = (
  data: MarkerData
) => string | Utils.PromiseWithProgress<string, string>;

export namespace AnkiNoteBuilder {
  export const MARKERS = {
    "": "-",
    word: "word",
    "word-furigana": "word (furigana)",
    "word-kana": "word (kana)",
    dict: "dictionary form",
    "dict-furigana": "dictionary form (furigana)",
    "dict-kana": "dictionary form (kana)",
    "main-dict": "main dictionary form",
    "main-dict-furigana": "main dictionary form (furigana)",
    "main-dict-kana": "main dictionary form (kana)",
    sentence: "sentence",
    "sentence-furigana": "sentence (furigana)",
    "sentence-kana": "sentence (kana)",
    "sentence-cloze": "sentence (cloze)",
    "sentence-cloze-furigana": "sentence (cloze) (furigana)",
    "translated-sentence": "translated sentence",
    meaning: "meaning",
    "meaning-full": "meaning (full)",
    "meaning-short": "meaning (short)",
    url: "url",
    link: "link",
  } as const;
  export type Marker = keyof typeof MARKERS;

  const _markerHandlers: {
    [marker: string]: MarkerHandler;
  } = {};

  export function markerKeys(): Marker[] {
    return Object.keys(MARKERS) as Marker[];
  }

  export function addMarker(marker: Marker, fn: MarkerHandler) {
    _markerHandlers[marker] = fn;
  }

  export function markerValue(
    marker: string,
    data: MarkerData
  ): string | Utils.PromiseWithProgress<string, string> {
    const handler = _markerHandlers[marker];
    let value = "";
    if (handler === undefined) {
      throw new Error(`Invalid marker in Anki note template: {{${marker}}}`);
    }
    return handler(data);
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

  export async function buildNote(data: MarkerData): Promise<LoadingNoteData> {
    const template = await Config.get("anki.template");
    if (template === null) {
      throw new Error(
        "You need to set up Anki template in the extension settings first."
      );
    }

    const note = cloneNote(template) as LoadingNoteData;
    for (const field of note.fields) {
      const marker = field.value as string;
      field.value = markerValue(marker, data);
    }
    return note;
  }

  addMarker("", (_data: MarkerData) => {
    return "";
  });

  addMarker("word", (data: MarkerData) => {
    const token = data.tokenized.tokens[data.tokenized.tokenIdx];
    return Utils.escapeHTML(token.text);
  });
  addMarker("word-furigana", (data: MarkerData) => {
    const token = data.tokenized.tokens[data.tokenized.tokenIdx];
    let rubies = RubyString.generate(token.text, token.reading);
    return Utils.escapeHTML(RubyString.toAnki(rubies));
  });
  addMarker("word-kana", (data: MarkerData) => {
    const token = data.tokenized.tokens[data.tokenized.tokenIdx];
    return Utils.escapeHTML(token.reading);
  });

  addMarker("dict", (data: MarkerData) => {
    const token = data.tokenized.tokens[data.tokenized.tokenIdx];
    return Utils.escapeHTML(token.base);
  });
  addMarker("dict-furigana", (data: MarkerData) => {
    const token = data.tokenized.tokens[data.tokenized.tokenIdx];
    const form = token.base;
    const reading = Entry.readingForForm(data.entry, form, false).reading;
    const rubies = RubyString.generate(form, reading);
    return Utils.escapeHTML(RubyString.toAnki(rubies));
  });
  addMarker("dict-kana", (data: MarkerData) => {
    const token = data.tokenized.tokens[data.tokenized.tokenIdx];
    const form = token.base;
    const kana = Entry.readingForForm(data.entry, form, false).reading;
    return Utils.escapeHTML(kana);
  });

  addMarker("main-dict", (data: MarkerData) => {
    return Utils.escapeHTML(Entry.mainForm(data.entry));
  });
  addMarker("main-dict-furigana", (data: MarkerData) => {
    const form = Entry.mainForm(data.entry);
    const reading = Entry.readingForForm(data.entry, form, false).reading;
    const rubies = RubyString.generate(form, reading);
    return Utils.escapeHTML(RubyString.toAnki(rubies));
  });
  addMarker("main-dict-kana", (data: MarkerData) => {
    const form = Entry.mainForm(data.entry);
    const kana = Entry.readingForForm(data.entry, form, false).reading;
    return Utils.escapeHTML(kana);
  });

  addMarker("sentence", (data: MarkerData) => {
    const tokenized = data.tokenized;
    const tokens = tokenized.tokens;

    let sentence = "";
    for (let i = 0; i < tokenized.tokenIdx; i++) {
      sentence += Utils.escapeHTML(tokens[i].text);
    }
    sentence += "<b>";
    sentence += Utils.escapeHTML(tokens[tokenized.tokenIdx].text);
    sentence += "</b>";
    for (let i = tokenized.tokenIdx + 1; i < tokens.length; i++) {
      sentence += Utils.escapeHTML(tokens[i].text);
    }
    return sentence;
  });
  addMarker("sentence-furigana", (data: MarkerData) => {
    const tokenized = data.tokenized;
    const tokens = tokenized.tokens;

    let rubies: RubyString = [];

    for (let i = 0; i < tokenized.tokenIdx; i++) {
      rubies.push(...RubyString.generate(tokens[i].text, tokens[i].reading));
    }
    const before = Utils.escapeHTML(RubyString.toAnki(rubies));

    const tokenRuby = RubyString.generate(
      tokens[tokenized.tokenIdx].text,
      tokens[tokenized.tokenIdx].reading
    );
    const tokenString = Utils.escapeHTML(RubyString.toAnki(tokenRuby));
    const mid = "<b>" + tokenString + "</b>";

    rubies = [];
    for (let i = tokenized.tokenIdx + 1; i < tokens.length; i++) {
      rubies.push(...RubyString.generate(tokens[i].text, tokens[i].reading));
    }
    const after = Utils.escapeHTML(RubyString.toAnki(rubies));
    return before + mid + after;
  });
  addMarker("sentence-kana", (data: MarkerData) => {
    let sentence = "";
    const tokenized = data.tokenized;
    const tokens = tokenized.tokens;
    for (let i = 0; i < tokenized.tokenIdx; i++) {
      sentence += Utils.escapeHTML(tokens[i].reading);
    }
    sentence += "<b>";
    sentence += Utils.escapeHTML(tokens[tokenized.tokenIdx].reading);
    sentence += "</b>";
    for (let i = tokenized.tokenIdx + 1; i < tokens.length; i++) {
      sentence += Utils.escapeHTML(tokens[i].reading);
      console.log(Utils.escapeHTML("<" + tokens[i].reading));
    }

    return sentence;
  });
  addMarker(
    "translated-sentence",
    (data: MarkerData): Utils.PromiseWithProgress<string, string> => {
      const translatePromise = translate(data.sentence);
      const promise = Utils.PromiseWithProgress.fromPromise(
        translatePromise,
        "Translating Sentence"
      );
      return promise;
    }
  );

  addMarker("sentence-cloze", (data: MarkerData) => {
    const tokenized = data.tokenized;
    const tokens = tokenized.tokens;
    let sentence = "";

    for (let i = 0; i < tokenized.tokenIdx; i++) {
      sentence += Utils.escapeHTML(tokens[i].text);
    }
    sentence += "{{c1::";
    sentence += Utils.escapeHTML(tokens[tokenized.tokenIdx].text);
    sentence += "}}";
    for (let i = tokenized.tokenIdx + 1; i < tokens.length; i++) {
      sentence += Utils.escapeHTML(tokens[i].text);
    }
    return sentence;
  });
  addMarker("sentence-cloze-furigana", (data: MarkerData) => {
    const tokenized = data.tokenized;
    const tokens = tokenized.tokens;
    let rubies: RubyString = [];

    for (let i = 0; i < tokenized.tokenIdx; i++) {
      rubies.push(...RubyString.generate(tokens[i].text, tokens[i].reading));
    }
    const before = Utils.escapeHTML(RubyString.toAnki(rubies));

    const tokenRuby = RubyString.generate(
      tokens[tokenized.tokenIdx].text,
      tokens[tokenized.tokenIdx].reading
    );
    const tokenString = Utils.escapeHTML(RubyString.toAnki(tokenRuby));
    const mid = "{{c1::" + tokenString + "}}";

    rubies = [];
    for (let i = tokenized.tokenIdx + 1; i < tokens.length; i++) {
      rubies.push(...RubyString.generate(tokens[i].text, tokens[i].reading));
    }
    const after = Utils.escapeHTML(RubyString.toAnki(rubies));
    return before + mid + after;
  });

  addMarker("meaning", (data: MarkerData) => {
    if (data.selectedMeaning === undefined) {
      return markerValue("meaning-full", data) as string;
    } else {
      return Utils.escapeHTML(data.selectedMeaning.meaning.join(", "));
    }
  });
  addMarker("meaning-full", (data: MarkerData) => {
    const lines = [];
    const grouped = Entry.groupSenses(data.entry);
    for (const group of grouped) {
      for (const meaning of group.senses) {
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

  addMarker("url", (data: MarkerData) => {
    return data.url;
  });
  addMarker("link", (data: MarkerData) => {
    const el = document.createElement("a");
    el.textContent = data.pageTitle;
    el.href = data.url;
    return el.outerHTML;
  });
  // TODO: translation, maybe sentence-cloze
}
