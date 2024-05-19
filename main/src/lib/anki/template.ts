
export interface AnkiTemplate {
  deck: string;
  notetype: string;
  tags: string;
  fields: AnyAnkiTemplateField[];
}

export interface AnkiTemplateFieldOptionsMap {
  "": Record<string, never>;
  "word": FieldWordOptions;
  "sentence": FieldSentenceOptions;
  "translated-sentence": Record<string, never>;
  "meaning": FieldMeaningOptions;
  "url": Record<string, never>;
  "link": Record<string, never>;
}

export type AnkiTemplateFieldType = keyof AnkiTemplateFieldOptionsMap

export interface AnkiTemplateField<T extends AnkiTemplateFieldType> {
  field: string;
  type: T;
  options: AnkiTemplateFieldOptionsMap[T]
}

// AnkiTemplateField<"word"> | AnkiTemplateField<"sentence"> | ...
export type AnyAnkiTemplateField = {
  [K in keyof AnkiTemplateFieldOptionsMap]: AnkiTemplateField<K>;
}[keyof AnkiTemplateFieldOptionsMap];


export type AnyAnkiTemplateFieldOptions = AnkiTemplateFieldOptionsMap[AnkiTemplateFieldType]

export interface FieldWordOptions {
  form: "as-is" | "dict-form" | "main-dict-form"
  style: "basic" | "furigana-anki" | "furigana-html" | "kana-only"
}

export interface FieldSentenceOptions {
  word: "none" | "cloze" | "bold" | "span"
  style: "basic" | "furigana-anki" | "furigana-html" | "kana-only"
}

export interface FieldMeaningOptions {
  format: "default" | "short"
}

export const ANKI_TEMPLATE_FIELD_TYPES: AnkiTemplateFieldType[] = ["", "word", "sentence", "translated-sentence", "meaning", "url", "link"]

const ANKI_TEMPLATE_FIELD_TYPE_LABELS: { [K in AnkiTemplateFieldType]: string } = {
  "": "-",
  "word": "word",
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
    if (opts.word === "bold") {
      label += " (bold)"
    } else if (opts.word === "cloze") {
      label += " (cloze)"
    } else if (opts.word === "span") {
      label += " (span)"
    }
  }
  if (type === "meaning") {
    const opts = options as AnkiTemplateFieldOptionsMap["meaning"]
    if (opts.format === "short") {
      label += " (short)"
    }
  }
  if (type === "word") {
    const opts = options as AnkiTemplateFieldOptionsMap["word"]
    if (opts.form === "dict-form") {
      label += " (dict)"
    } else if (opts.form === "main-dict-form") {
      label += " (main dict)"
    }
  }
  if (type === "word" || type === "sentence") {
    const opts = options as AnkiTemplateFieldOptionsMap["word" | "sentence"]
    if (opts.style === "furigana-anki") {
      label += " (furigana-anki)"
    } else if (opts.style === "furigana-html") {
      label += " (furigana-html)"
    } else if (opts.style === "kana-only") {
      label += " (kana)"
    }
  }
  return label
}


export function defaultFieldWordOptions(): FieldWordOptions {
  return {
    form: "as-is",
    style: "basic"
  }
}

export function defaultFieldSentenceOptions(): FieldSentenceOptions {
  return {
    style: "basic",
    word: "none",
  }
}

export function defaultFieldMeaningOptions(): FieldMeaningOptions {
  return {
    format: "default"
  }
}