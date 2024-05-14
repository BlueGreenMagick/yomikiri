
export interface AnkiTemplate {
  deck: string;
  notetype: string;
  tags: string;
  fields: AnyFieldTemplate[];
}

interface FieldTemplateOptionsMap {
  "word": FieldTemplateWordOptions
  "dictionary-form": FieldTemplateDictionaryFormOptions
  "main-dictionary-form": FieldTemplateMainDictionaryFormOptions
  "sentence": FieldTemplateSentenceOptions,
  "translated-sentence": never,
  "meaning": FieldTemplateMeaningOptions,
  "url": never,
  "link": never
}

export interface FieldTemplate<T extends keyof FieldTemplateOptionsMap> {
  field: string;
  type: T;
  options: FieldTemplateOptionsMap[T]
}

export type AnyFieldTemplate = FieldTemplate<keyof FieldTemplateOptionsMap>

export interface FieldTemplateWordOptions {
  form: "default" | "kanji" | "kana"
  furigana: "none" | "furigana-anki" | "furigana-html"
}

export interface FieldTemplateDictionaryFormOptions {
  form: "default" | "kanji" | "kana"
  furigana: "none" | "furigana-anki" | "furigana-html"
}

export interface FieldTemplateMainDictionaryFormOptions {
  furigana: "none" | "furigana-anki" | "furigana-html"
  kana: boolean
}

export interface FieldTemplateSentenceOptions {
  form: "default" | "kanji" | "kana"
  furigana: "none" | "furigana-anki" | "furigana-html"
  bold: boolean
  cloze: boolean
}

export interface FieldTemplateMeaningOptions {
  format: "default" | "short"
}