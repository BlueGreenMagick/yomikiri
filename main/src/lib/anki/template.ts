
export interface AnkiTemplate {
  deck: string;
  notetype: string;
  tags: string;
  fields: AnyAnkiTemplateField[];
}

export interface AnkiTemplateFieldOptionsMap {
  "": Record<string, never>
  "word": FieldWordOptions
  "dict-form": FieldDictFormOptions
  "main-dict-form": FieldMainDictFormOptions
  "sentence": FieldSentenceOptions,
  "translated-sentence": Record<string, never>,
  "meaning": FieldMeaningOptions,
  "url": Record<string, never>,
  "link": Record<string, never>
}

export type AnkiTemplateFieldType = keyof AnkiTemplateFieldOptionsMap

export interface AnkiTemplateField<T extends AnkiTemplateFieldType> {
  field: string;
  type: T;
  options: AnkiTemplateFieldOptionsMap[T]
}

// AnkiTemplateField<"word"> | AnkiTemplateField<"dict-form"> | ...
export type AnyAnkiTemplateField = {
  [K in keyof AnkiTemplateFieldOptionsMap]: AnkiTemplateField<K>;
}[keyof AnkiTemplateFieldOptionsMap];


export type AnyAnkiTemplateFieldOptions = AnkiTemplateFieldOptionsMap[AnkiTemplateFieldType]

export interface FieldWordOptions {
  form: "default" | "kanji" | "kana"
  furigana: "none" | "furigana-anki" | "furigana-html"
}

export interface FieldDictFormOptions {
  form: "default" | "kanji" | "kana"
  furigana: "none" | "furigana-anki" | "furigana-html"
}

export interface FieldMainDictFormOptions {
  furigana: "none" | "furigana-anki" | "furigana-html"
  kana: boolean
}

export interface FieldSentenceOptions {
  form: "default" | "kanji" | "kana"
  furigana: "none" | "furigana-anki" | "furigana-html"
  bold: boolean
  cloze: boolean
}

export interface FieldMeaningOptions {
  format: "default" | "short"
}


export const ANKI_TEMPLATE_FIELD_TYPES: AnkiTemplateFieldType[] = ["", "word", "dict-form", "main-dict-form", "sentence", "translated-sentence", "meaning", "url", "link"]

const ANKI_TEMPLATE_FIELD_TYPE_LABELS: { [K in AnkiTemplateFieldType]: string } = {
  "": "-",
  "word": "word",
  "dict-form": "dictionary form",
  "main-dict-form": "main dictionary form",
  "sentence": "sentence",
  "translated-sentence": "translated-sentence",
  "meaning": "meaning",
  "url": "url",
  "link": "link",
}

export function ankiTemplateFieldLabel<T extends AnkiTemplateFieldType>(type: T, options?: AnkiTemplateFieldOptionsMap[T]): string {
  let label: string = ANKI_TEMPLATE_FIELD_TYPE_LABELS[type]
  if (options === undefined) {
    return label
  }

  if (type === "sentence") {
    const opts = options as AnkiTemplateFieldOptionsMap["sentence"]
    if (opts.cloze) {
      label += " (cloze)"
    }
    if (opts.bold) {
      label += " (bold)"
    }
  }
  if (type === "meaning") {
    const opts = options as AnkiTemplateFieldOptionsMap["meaning"]
    if (opts.format === "short") {
      label += " (short)"
    }
  }
  if (type === "word" || type === "dict-form" || type === "sentence") {
    const opts = options as AnkiTemplateFieldOptionsMap["word" | "dict-form" | "sentence"]
    if (opts.form === "kanji") {
      label += " (kanji)"
    } else if (opts.form === "kana") {
      label += " (kana)"
    }
  }
  if (type === "main-dict-form") {
    const opts = options as AnkiTemplateFieldOptionsMap["main-dict-form"]
    if (opts.kana) {
      label += " (kana)"
    }
  }
  if (type === "word" || type === "dict-form" || type === "main-dict-form" || type === "sentence") {
    const opts = options as AnkiTemplateFieldOptionsMap["word" | "dict-form" | "main-dict-form" | "sentence"]
    if (opts.furigana === "furigana-anki") {
      label += " (furigana-anki)"
    } else if (opts.furigana === "furigana-html") {
      label += " (furigana-html)"
    }
  }
  return label
}


export function defaultFieldWordOptions(): FieldWordOptions {
  return {
    form: "default",
    furigana: "none"
  }
}

export function defaultFieldDictionaryFormOptions(): FieldDictFormOptions {
  return {
    form: "default",
    furigana: "none"
  }
}

export function defaultFieldMainDictionaryFormOptions(): FieldMainDictFormOptions {
  return {
    furigana: "none",
    kana: false
  }
}

export function defaultFieldSentenceOptions(): FieldSentenceOptions {
  return {
    form: "default",
    furigana: "none",
    bold: true,
    cloze: false
  }
}

export function defaultFieldMeaningOptions(): FieldMeaningOptions {
  return {
    format: "default"
  }
}