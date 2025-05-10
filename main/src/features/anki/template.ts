import { YomikiriError } from "@/features/error";

export interface AnkiTemplate {
  deck: string;
  notetype: string;
  tags: string;
  fields: AnkiTemplateField[];
}

export type AnkiTemplateFieldContent = keyof AnkiTemplateFieldTypes;

interface FieldBase<C extends keyof AnkiTemplateFieldTypes> {
  name: string;
  content: C;
}

export interface AnkiTemplateFieldTypes {
  "": FieldBase<"">;
  word: FieldBase<"word"> & AnkiTemplateFieldWordOptions;
  sentence: FieldBase<"sentence"> & AnkiTemplateFieldSentenceOptions;
  "translated-sentence": FieldBase<"translated-sentence">;
  meaning: FieldBase<"meaning"> & AnkiTemplateFieldMeaningOptions;
  url: FieldBase<"url">;
  link: FieldBase<"link">;
}

export type AnkiTemplateField = AnkiTemplateFieldTypes[keyof AnkiTemplateFieldTypes];

/* Field Options */
export interface AnkiTemplateFieldWordOptions {
  form: "as-is" | "dict-form" | "main-dict-form";
  style: "basic" | "furigana-anki" | "furigana-html" | "kana-only";
}

export interface AnkiTemplateFieldSentenceOptions {
  word: "none" | "cloze" | "bold" | "span";
  style: "basic" | "furigana-anki" | "furigana-html" | "kana-only";
}

export interface AnkiTemplateFieldMeaningOptions {
  full_format: "numbered" | "unnumbered" | "line" | "div" | "yomichan";
  full_pos: boolean;
  /** Use the first N glossaries per meaning. 0 to set if off. */
  full_max_item: number;
  /** TODO: Use the first N meanings evenly across each pos group. 0 to set it off. */
  // Contain at least 1 meaning from each pos group, then by order
  // full_max_meaning: number
  // short_max_meaning: number

  /* Options for single selected meaning */
  single_pos: boolean;
  single_max_item: number;
}

export const ANKI_TEMPLATE_FIELD_TYPES: AnkiTemplateFieldContent[] = [
  "",
  "word",
  "sentence",
  "translated-sentence",
  "meaning",
  "url",
  "link",
];

const ANKI_TEMPLATE_FIELD_TYPE_LABELS: {
  [K in AnkiTemplateFieldContent]: string;
} = {
  "": "-",
  word: "word",
  sentence: "sentence",
  "translated-sentence": "translated-sentence",
  meaning: "meaning",
  url: "url",
  link: "link",
};

export function ankiTemplateFieldLabel(field: AnkiTemplateField): string {
  const content = field.content;
  let label = ANKI_TEMPLATE_FIELD_TYPE_LABELS[content];

  if (content === "sentence") {
    if (field.word === "bold") {
      label += " (bold)";
    } else if (field.word === "cloze") {
      label += " (cloze)";
    } else if (field.word === "span") {
      label += " (span)";
    }
  }
  if (content === "meaning") {
    if (field.full_format === "unnumbered") {
      label += " (unnumbered)";
    } else if (field.full_format === "line") {
      label += " (line)";
    } else if (field.full_format === "div") {
      label += " (div)";
    } else if (field.full_format === "yomichan") {
      label += " (yomichan)";
    }

    if (field.full_pos) {
      if (field.single_pos) {
        label += " (pos)";
      } else {
        label += " (pos-full)";
      }
    } else if (field.single_pos) {
      label += " (pos-single)";
    }
    if (field.full_max_item > 0) {
      label += ` (item-full <= ${field.full_max_item})`;
    }
    if (field.single_max_item > 0) {
      label += ` (item-single <= ${field.single_max_item})`;
    }
  }
  if (content === "word") {
    if (field.form === "dict-form") {
      label += " (dict)";
    } else if (field.form === "main-dict-form") {
      label += " (main-dict)";
    }
  }
  if (content === "word" || content === "sentence") {
    if (field.style === "furigana-anki") {
      label += " (furigana-anki)";
    } else if (field.style === "furigana-html") {
      label += " (furigana-html)";
    } else if (field.style === "kana-only") {
      label += " (kana)";
    }
  }
  return label;
}

export function newAnkiTemplateField<C extends AnkiTemplateFieldContent>(
  name: string,
  content: C,
): AnkiTemplateFieldTypes[C];
export function newAnkiTemplateField(
  name: string,
  content: AnkiTemplateFieldContent,
): AnkiTemplateField {
  if (
    content === "" ||
    content === "translated-sentence" ||
    content === "url" ||
    content === "link"
  ) {
    return {
      name,
      content: content,
    };
  } else if (content === "word") {
    return {
      name,
      content: content,
      form: "as-is",
      style: "basic",
    };
  } else if (content === "sentence") {
    return {
      name,
      content: content,
      style: "basic",
      word: "none",
    };
  } else if (content === "meaning") {
    return {
      name,
      content: content,
      full_format: "numbered",
      full_pos: false,
      full_max_item: 0,
      single_pos: false,
      single_max_item: 0,
    };
  } else {
    throw new YomikiriError(`Invalid Anki template field type '${content}'`);
  }
}
