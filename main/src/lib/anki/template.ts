
export interface AnkiTemplate {
  deck: string;
  notetype: string;
  tags: string;
  fields: AnkiTemplateField[];
}

export type AnkiTemplateFieldContent = keyof AnkiTemplateFieldTypes

interface FieldBase<C extends keyof AnkiTemplateFieldTypes> {
  name: string;
  content: C
}

export interface AnkiTemplateFieldTypes {
  "": FieldBase<"">;
  "word": FieldBase<"word"> & AnkiTemplateFieldWordOptions;
  "sentence": FieldBase<"sentence"> & AnkiTemplateFieldSentenceOptions;
  "translated-sentence": FieldBase<"translated-sentence">;
  "meaning": FieldBase<"meaning"> & AnkiTemplateFieldMeaningOptions;
  "url": FieldBase<"url">;
  "link": FieldBase<"link">;
}

export type AnkiTemplateField = AnkiTemplateFieldTypes[keyof AnkiTemplateFieldTypes]

/* Field Options */
export interface AnkiTemplateFieldWordOptions {
  form: "as-is" | "dict-form" | "main-dict-form"
  style: "basic" | "furigana-anki" | "furigana-html" | "kana-only"
}

export interface AnkiTemplateFieldSentenceOptions {
  word: "none" | "cloze" | "bold" | "span"
  style: "basic" | "furigana-anki" | "furigana-html" | "kana-only"
}

export interface AnkiTemplateFieldMeaningOptions {
  format: "default" | "short"
}

export const ANKI_TEMPLATE_FIELD_TYPES: AnkiTemplateFieldContent[] = ["", "word", "sentence", "translated-sentence", "meaning", "url", "link"]

const ANKI_TEMPLATE_FIELD_TYPE_LABELS: { [K in AnkiTemplateFieldContent]: string } = {
  "": "-",
  "word": "word",
  "sentence": "sentence",
  "translated-sentence": "translated-sentence",
  "meaning": "meaning",
  "url": "url",
  "link": "link",
}

export function ankiTemplateFieldLabel(field: AnkiTemplateField): string {
  const content = field.content
  let label = ANKI_TEMPLATE_FIELD_TYPE_LABELS[content]

  if (content === "sentence") {
    if (field.word === "bold") {
      label += " (bold)"
    } else if (field.word === "cloze") {
      label += " (cloze)"
    } else if (field.word === "span") {
      label += " (span)"
    }
  }
  if (content === "meaning") {
    if (field.format === "short") {
      label += " (short)"
    }
  }
  if (content === "word") {
    if (field.form === "dict-form") {
      label += " (dict)"
    } else if (field.form === "main-dict-form") {
      label += " (main dict)"
    }
  }
  if (content === "word" || content === "sentence") {
    if (field.style === "furigana-anki") {
      label += " (furigana-anki)"
    } else if (field.style === "furigana-html") {
      label += " (furigana-html)"
    } else if (field.style === "kana-only") {
      label += " (kana)"
    }
  }
  return label
}

export function newAnkiTemplateField(name: string, content: AnkiTemplateFieldContent): AnkiTemplateField {
  if (content === "" || content === "translated-sentence" || content === "url" || content === "link") {
    return {
      name, content: content
    }
  } else if (content === "word") {
    return {
      name, content: content,
      form: "as-is",
      style: "basic"
    }
  } else if (content === "sentence") {
    return {
      name, content: content,
      style: "basic",
      word: "none"
    }
  } else if (content === "meaning") {
    return {
      name, content: content,
      format: "default"
    }
  } else {
    throw new Error(`Invalid Anki template field type '${content}'`)
  }
}