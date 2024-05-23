import type { Token, TokenizeResult } from "@platform/backend";
import Config from "../config";
import { Entry, type Sense } from "../dicEntry";
import { RubyString } from "../japanese";
import { Platform } from "@platform";
import Utils, { escapeHTML } from "../utils";
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


export function buildAnkiNote(ctx: AnkiBuilderContext, data: AnkiBuilderData): LoadingAnkiNote {
  const template = ctx.config.get("anki.anki_template");
  if (template === null) {
    throw new Error(
      "You need to set up Anki template in the extension settings first."
    );
  }

  const note: LoadingAnkiNote = {
    ...template,
    fields: []
  }
  for (const templateField of template.fields) {
    const fieldValue = buildAnkiField(ctx, data, templateField);
    note.fields.push(fieldValue)
  }
  return note;
}


type FieldBuilder<T extends AnkiTemplateFieldType> = (opts: AnkiTemplateFieldOptionsMap[T], data: AnkiBuilderData, ctx: AnkiBuilderContext) => string | Utils.PromiseWithProgress<string, string>;

const fieldBuilders: Partial<{ [K in AnkiTemplateFieldType]: FieldBuilder<K> }> = {}

export function buildAnkiField<T extends AnkiTemplateFieldType>(ctx: AnkiBuilderContext, data: AnkiBuilderData, template: AnkiTemplateField<T>): LoadingField | Field {
  const builder = fieldBuilders[template.type]
  if (builder === undefined) {
    throw new Error(`Invalid Anki template field type: '${template.type}'`);
  }
  const value = builder(template.options, data, ctx)

  return {
    name: template.name,
    value
  }
}

function addBuilder<T extends AnkiTemplateFieldType>(type: T, builder: (typeof fieldBuilders)[T]) {
  fieldBuilders[type] = builder
}

addBuilder("", () => "")

addBuilder("word", (opts, data) => {
  const token = data.tokenized.tokens[data.tokenized.tokenIdx];

  let word: string
  let reading: string;
  if (opts.form === "as-is") {
    word = token.text
    reading = token.reading
  } else if (opts.form === "dict-form") {
    word = token.base
    reading = Entry.readingForForm(data.entry, word, false).reading
  } else if (opts.form === "main-dict-form") {
    word = Entry.mainForm(data.entry)
    reading = Entry.readingForForm(data.entry, word, false).reading
  } else {
    throw new Error(`Invalid Anki template field option value for 'form': '${opts.form}'`)
  }

  word = escapeHTML(word)
  reading = escapeHTML(reading)

  if (opts.style === "basic") {
    return word
  }
  else if (opts.style === "furigana-anki") {
    const rubied = RubyString.generate(word, reading)
    return RubyString.toAnki(rubied)
  } else if (opts.style === "furigana-html") {
    const rubied = RubyString.generate(word, reading)
    return RubyString.toHtml(rubied)
  } else if (opts.style === "kana-only") {
    return reading
  } else {
    throw new Error(`Invalid Anki template field option value for 'style': '${opts.style}`)
  }
})

addBuilder("meaning", (opts, data) => {
  if (opts.format === "default") {
    const lines = [];
    const grouped = Entry.groupSenses(data.entry);
    for (const group of grouped) {
      for (const meaning of group.senses) {
        const meaningLine = Utils.escapeHTML(meaning.meaning.join(", "));
        lines.push(`<span class="yk-meaning">${meaningLine}</span>`);
      }
    }
    return lines.join("<br>");
  } else if (opts.format === "short") {
    if (data.selectedMeaning === undefined) {
      const meanings = [];
      const cnt = Math.min(3, data.entry.senses.length);
      for (let i = 0; i < cnt; i++) {
        meanings.push(data.entry.senses[i].meaning[0]);
      }
      return escapeHTML(meanings.join("; "));
    } else {
      const raw = data.selectedMeaning.meaning.slice(0, 2).join(", ");
      return escapeHTML(raw);
    }
  } else {
    throw new Error(`Invalid Anki template field option value for 'format': '${opts.format}'`)
  }
})

addBuilder("sentence", (opts, data) => {
  const tokenized = data.tokenized;
  const tokens = tokenized.tokens;
  const wordToken = tokens[tokenized.tokenIdx]
  const optStyle = opts.style
  const optWord = opts.word

  let rubiesToString: (ruby: RubyString) => string
  if (optStyle === "furigana-html") {
    rubiesToString = RubyString.toHtml
  } else {
    rubiesToString = RubyString.toAnki
  }

  let getText: (token: Token) => RubyString
  if (optStyle === "basic") {
    getText = (token) => RubyString.generate(token.text)
  } else if (optStyle === "furigana-anki" || optStyle === "furigana-html") {
    getText = (token) => RubyString.generate(token.text, token.reading)
  } else if (optStyle === "kana-only") {
    getText = (token) => RubyString.generate(token.reading)
  } else {
    throw new Error(`Invalid Anki template field option value for 'style': '${optStyle}`)
  }

  let wrapWord: (word: string) => string
  if (optWord === "none") {
    wrapWord = (word) => word
  } else if (optWord === "bold") {
    wrapWord = (word) => `<b>${word}</b>`
  } else if (optWord === "cloze") {
    wrapWord = (word) => `{{c1::${word}}}`
  } else if (optWord === "span") {
    wrapWord = (word) => `<span class="yomi-word">${word}</span>`
  } else {
    throw new Error(`Invalid Anki template field option value for 'word': '${optWord}`)
  }

  let rubies: RubyString = []
  for (let i = 0; i < tokenized.tokenIdx; i++) {
    rubies.push(...getText(tokens[i]))
  }
  const pre = Utils.escapeHTML(rubiesToString(rubies))

  const tokenRuby = getText(wordToken)
  const wordString = Utils.escapeHTML(rubiesToString(tokenRuby))
  const mid = wrapWord(wordString)

  rubies = []
  for (let i = tokenized.tokenIdx + 1; i < tokens.length; i++) {
    rubies.push(...getText(tokens[i]));
  }
  const suf = Utils.escapeHTML(rubiesToString(rubies))

  const sentence = pre + mid + suf
  return sentence.trim()
})

addBuilder("translated-sentence", (_opts, data, { platform }) => {
  const translatePromise = platform.translate(data.sentence);
  const promise = Utils.PromiseWithProgress.fromPromise(
    translatePromise.then((result) => result.translated.trim()),
    "Translating Sentence..."
  );
  return promise;
})

addBuilder("url", (_opts, data) => {
  return data.url
})

addBuilder("link", (_opts, data) => {
  const el = document.createElement("a");
  el.textContent = data.pageTitle;
  el.href = data.url;
  return el.outerHTML;
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
      throw new Error(`Invalid marker in Anki note template: {{ ${marker}}
}`);
    }
    return handler(ctx, data);
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
        lines.push(`< span class= "yk-meaning"> ${meaningLine} < /span>`);
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