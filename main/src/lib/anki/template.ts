
export interface AnkiTemplate {
  deck: string;
  notetype: string;
  tags: string;
  fields: AnyFieldTemplate[];
}

export interface FieldTemplateOptionsMap {
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

export type AnkiTemplateFieldType = keyof FieldTemplateOptionsMap

export const ANKI_TEMPLATE_FIELD_TYPES: AnkiTemplateFieldType[] = ["", "word", "dict-form", "main-dict-form", "sentence", "translated-sentence", "meaning", "url", "link"]

export interface FieldTemplate<T extends AnkiTemplateFieldType> {
  field: string;
  type: T;
  options: FieldTemplateOptionsMap[T]
}

// FieldTemplate<"word"> | FieldTemplate<"dict-form"> | ...
export type AnyFieldTemplate = {
  [K in keyof FieldTemplateOptionsMap]: FieldTemplate<K>;
}[keyof FieldTemplateOptionsMap];


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