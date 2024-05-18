import type { TokenizeResult } from "@platform/backend";
import Config from "../config";
import { Entry, type Sense } from "../dicEntry";
import { RubyString } from "../japanese";
import { Platform } from "@platform";
import Utils from "../utils";
import type { AnkiTemplateField, AnkiTemplateFieldOptionsMap, AnkiTemplateFieldType } from "./template";

export interface LoadingAnkiNote {
  deck: string;
  notetype: string;
  fields: (LoadingField | Field)[];
  tags: string;
}

export interface AnkiNote extends LoadingAnkiNote {
  fields: Field[];
}

export interface Field {
  name: string;
  value: string;
}

export interface LoadingField {
  name: string;
  value: string | Utils.PromiseWithProgress<string, string>;
}


export interface AnkiBuilderContext {
  platform: Platform,
  config: Config
}

/** This data is saved in the history */
export interface AnkiBuilderData {
  tokenized: TokenizeResult;
  entry: Entry;
  selectedMeaning?: Sense | undefined;
  /** NFC normalized string */
  sentence: string;
  /** window.location.href */
  url: string;
  /** document.title */
  pageTitle: string;
}


export type AnkiFieldBuilder = (
  ctx: AnkiBuilderContext,
  data: AnkiBuilderData
) => string | Utils.PromiseWithProgress<string, string>;



export async function waitForNoteToLoad(note: LoadingAnkiNote): Promise<void> {
  const promises = [];
  for (const field of note.fields) {
    if (field.value instanceof Promise) {
      promises.push(field.value);
    }
  }
  await Promise.allSettled(promises);
}

/** LoadingNoteData is in-place resolved to NoteData */
export async function resolveAnkiNote(note: LoadingAnkiNote): Promise<AnkiNote> {
  for (const field of note.fields) {
    field.value = await field.value;
  }
  return note as AnkiNote;
}


type FieldBuilder<T extends AnkiTemplateFieldType> = (opts: AnkiTemplateFieldOptionsMap[T], ctx: AnkiBuilderContext, data: AnkiBuilderData) => string | Utils.PromiseWithProgress<string, string>;

const fieldBuilders: Partial<{ [K in AnkiTemplateFieldType]: FieldBuilder<K> }> = {}

export function buildAnkiField<T extends AnkiTemplateFieldType>(ctx: AnkiBuilderContext, data: AnkiBuilderData, template: AnkiTemplateField<T>): LoadingField | Field {
  const builder = fieldBuilders[template.type]
  if (builder === undefined) {
    throw new Error(`Invalid Anki template field type: '${template.type}'`);
  }
  const value = builder(template.options, ctx, data)

  return {
    name: template.field,
    value
  }
}

function setBuilder<T extends AnkiTemplateFieldType>(type: T, builder: (typeof fieldBuilders)[T]) {
  fieldBuilders[type] = builder
}

setBuilder("word", (opts, _ctx, data) => {
  const token = data.tokenized.tokens[data.tokenized.tokenIdx];
  const text = Utils.escapeHTML(token.text)
  const reading = Utils.escapeHTML(token.reading)

  // TODO: opts.form config
  if (opts.furigana === "furigana-anki") {
    const rubied = RubyString.generate(text, reading)
    return RubyString.toAnki(rubied)
  } else if (opts.furigana === "furigana-html") {
    const rubied = RubyString.generate(text, reading)
    return RubyString.toHtml(rubied)
  } else {
    return text
  }
})



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

  const _markerHandlers: Record<string, AnkiFieldBuilder> = {};

  export function markerKeys(): Marker[] {
    return Object.keys(MARKERS) as Marker[];
  }

  export function addMarker(marker: Marker, fn: AnkiFieldBuilder) {
    _markerHandlers[marker] = fn;
  }

  export function markerValue(
    marker: string,
    ctx: AnkiBuilderContext,
    data: AnkiBuilderData
  ): string | Utils.PromiseWithProgress<string, string> {
    const handler = _markerHandlers[marker];
    if (handler === undefined) {
      throw new Error(`Invalid marker in Anki note template: {{${marker}}}`);
    }
    return handler(ctx, data);
  }

  function cloneNote(n: AnkiNote): AnkiNote {
    const note: AnkiNote = {
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

  export function buildNote(ctx: AnkiBuilderContext, data: AnkiBuilderData): LoadingAnkiNote {
    const template = ctx.config.get("anki.template");
    if (template === null) {
      throw new Error(
        "You need to set up Anki template in the extension settings first."
      );
    }

    const note = cloneNote(template) as LoadingAnkiNote;
    for (const field of note.fields) {
      const marker = field.value as string;
      field.value = markerValue(marker, ctx, data);
    }
    return note;
  }

  addMarker("", (_ctx, _data: AnkiBuilderData) => {
    return "";
  });

  addMarker("word", (_ctx, data: AnkiBuilderData) => {
    const token = data.tokenized.tokens[data.tokenized.tokenIdx];
    return Utils.escapeHTML(token.text);
  });
  addMarker("word-furigana", (_ctx, data: AnkiBuilderData) => {
    const token = data.tokenized.tokens[data.tokenized.tokenIdx];
    const rubies = RubyString.generate(token.text, token.reading);
    return Utils.escapeHTML(RubyString.toAnki(rubies));
  });
  addMarker("word-kana", (_ctx, data: AnkiBuilderData) => {
    const token = data.tokenized.tokens[data.tokenized.tokenIdx];
    return Utils.escapeHTML(token.reading);
  });

  addMarker("dict", (_ctx, data: AnkiBuilderData) => {
    const token = data.tokenized.tokens[data.tokenized.tokenIdx];
    return Utils.escapeHTML(token.base);
  });
  addMarker("dict-furigana", (_ctx, data: AnkiBuilderData) => {
    const token = data.tokenized.tokens[data.tokenized.tokenIdx]
    const form = token.base;
    const reading = Entry.readingForForm(data.entry, form, false).reading;
    const rubies = RubyString.generate(form, reading);
    return Utils.escapeHTML(RubyString.toAnki(rubies));
  });
  addMarker("dict-kana", (_ctx, data: AnkiBuilderData) => {
    const token = data.tokenized.tokens[data.tokenized.tokenIdx];
    const form = token.base;
    const kana = Entry.readingForForm(data.entry, form, false).reading;
    return Utils.escapeHTML(kana);
  });

  addMarker("main-dict", (_ctx, data: AnkiBuilderData) => {
    return Utils.escapeHTML(Entry.mainForm(data.entry));
  });
  addMarker("main-dict-furigana", (_ctx, data: AnkiBuilderData) => {
    const form = Entry.mainForm(data.entry);
    const reading = Entry.readingForForm(data.entry, form, false).reading;
    const rubies = RubyString.generate(form, reading);
    return Utils.escapeHTML(RubyString.toAnki(rubies));
  });
  addMarker("main-dict-kana", (_ctx, data: AnkiBuilderData) => {
    const form = Entry.mainForm(data.entry);
    const kana = Entry.readingForForm(data.entry, form, false).reading;
    return Utils.escapeHTML(kana);
  });

  addMarker("sentence", (_ctx, data: AnkiBuilderData) => {
    const tokenized = data.tokenized;
    const tokens = tokenized.tokens;

    let sentence = "";
    for (let i = 0; i < tokenized.tokenIdx; i++) {
      sentence += Utils.escapeHTML(tokens[i].text)
    }
    sentence += "<b>";
    sentence += Utils.escapeHTML(tokens[tokenized.tokenIdx].text);
    sentence += "</b>";
    for (let i = tokenized.tokenIdx + 1; i < tokens.length; i++) {
      sentence += Utils.escapeHTML(tokens[i].text);
    }
    return sentence.trim();
  });
  addMarker("sentence-furigana", (_ctx, data: AnkiBuilderData) => {
    const tokenized = data.tokenized;
    const tokens = tokenized.tokens;

    let rubies: RubyString = [];

    for (let i = 0; i < tokenized.tokenIdx; i++) {
      rubies.push(...RubyString.generate(tokens[i].text, tokens[i].reading));
    }
    const before = Utils.escapeHTML(RubyString.toAnki(rubies))

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
    const sentence = before + mid + after;
    return sentence.trim();
  });
  addMarker("sentence-kana", (_ctx, data: AnkiBuilderData) => {
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
    }

    return sentence.trim();
  });
  addMarker(
    "translated-sentence",
    (ctx, data: AnkiBuilderData): Utils.PromiseWithProgress<string, string> => {
      const translatePromise = ctx.platform.translate(data.sentence);
      const promise = Utils.PromiseWithProgress.fromPromise(
        translatePromise.then((result) => result.translated.trim()),
        "Translating Sentence..."
      );
      return promise;
    }
  );

  addMarker("sentence-cloze", (_ctx, data: AnkiBuilderData) => {
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
    return sentence.trim();
  });
  addMarker("sentence-cloze-furigana", (_ctx, data: AnkiBuilderData) => {
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
    const sentence = before + mid + after;
    return sentence.trim()
  });

  addMarker("meaning", (ctx, data: AnkiBuilderData) => {
    if (data.selectedMeaning === undefined) {
      return markerValue("meaning-full", ctx, data) as string;
    } else {
      return Utils.escapeHTML(data.selectedMeaning.meaning.join(", "));
    }
  });
  addMarker("meaning-full", (_ctx, data: AnkiBuilderData) => {
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
  addMarker("meaning-short", (_ctx, data: AnkiBuilderData) => {
    if (data.selectedMeaning === undefined) {
      const meanings = [];
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

  addMarker("url", (_ctx, data: AnkiBuilderData) => {
    return data.url;
  });
  addMarker("link", (_ctx, data: AnkiBuilderData) => {
    const el = document.createElement("a");
    el.textContent = data.pageTitle;
    el.href = data.url;
    return el.outerHTML;
  });
  // TODO: translation, maybe sentence-cloze
}
