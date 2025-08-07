import type { StoredConfig } from "./types";
import type * as V2 from "./v2";

export interface AnkiTemplate {
  deck: string;
  notetype: string;
  tags: string;
  fields: AnkiTemplateField[];
}

interface FieldBase<C extends keyof AnkiTemplateFieldTypes> {
  name: string;
  content: C;
}

export type AnkiTemplateFieldContent = keyof AnkiTemplateFieldTypes;

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

export interface AnkiNote {
  deck: string;
  notetype: string;
  fields: Field[];
  tags: string;
}

export type Field = V2.Field;

export interface TTSVoice {
  id: string;
  name: string;
  /**
   * Higher is better.
   *
   * For desktop:
   * - remote: 100
   * - non-remote: 200
   *
   * For ios:
   * - default: 100
   * - enhanced: 200
   * - premium: 300
   */
  quality: number;
}

export interface Configuration {
  "state.enabled": boolean;
  /** Only for desktop */
  "state.anki.deferred_note_count": number;
  /** Only for desktop */
  "state.anki.deferred_note_error": boolean;
  "general.font_size": number;
  "general.font": string;
  "general.tooltip_max_height": number;
  "anki.connect_port": number;
  "anki.connect_url": string;
  "anki.anki_template": AnkiTemplate | null;
  "anki.enabled": boolean;
  /** Defer adding notes if Anki cannot be connected. */
  "anki.defer_notes": boolean;
  /** On ios, if auto redirect back to safari */
  "anki.ios_auto_redirect": boolean;
  /** set to null if voice is not available */
  "tts.voice": TTSVoice | null;
  /** Yomikiri semantic version on last config save */
  version: string;
  config_version: 3;
}

export function migrateConfiguration_2(
  config: StoredConfig<V2.Configuration>,
): StoredConfig<Configuration> {
  const newConfig = {
    ...config,
    config_version: 3,
  } as StoredConfig<Configuration>;

  const ankiTemplate = config["anki.template"];
  if (ankiTemplate !== undefined && ankiTemplate !== null) {
    newConfig["anki.anki_template"] = migrateAnkiTemplate_2(ankiTemplate);
  }

  return newConfig;
}

function migrateAnkiTemplate_2(template: AnkiNote): AnkiTemplate {
  return {
    ...template,
    fields: template.fields.map(fieldTemplateToAnyFieldTemplate),
  };
}

export function fieldTemplateToAnyFieldTemplate(fld: Field): AnkiTemplateField {
  const type = fld.value;
  const name = fld.name;
  if (type === "") {
    return {
      name,
      content: type,
    };
  } else if (["word", "word-furigana", "word-kana"].includes(type)) {
    const options: AnkiTemplateFieldWordOptions = {
      form: "as-is",
      style: type === "word-furigana" ?
        "furigana-anki" :
        type === "word-kana" ?
        "kana-only" :
        "basic",
    };
    return {
      name,
      content: "word",
      ...options,
    };
  } else if (
    type === "dict" ||
    type === "dict-furigana" ||
    type === "dict-kana"
  ) {
    const options: AnkiTemplateFieldWordOptions = {
      form: "dict-form",
      style: type === "dict-furigana" ?
        "furigana-anki" :
        type === "dict-kana" ?
        "kana-only" :
        "basic",
    };
    return { name, content: "word", ...options };
  } else if (
    type === "main-dict" ||
    type === "main-dict-furigana" ||
    type === "main-dict-kana"
  ) {
    const options: AnkiTemplateFieldWordOptions = {
      form: "main-dict-form",
      style: type === "main-dict-furigana" ?
        "furigana-anki" :
        type === "main-dict-kana" ?
        "kana-only" :
        "basic",
    };
    return {
      name,
      content: "word",
      ...options,
    };
  } else if (
    type === "sentence" ||
    type === "sentence-furigana" ||
    type === "sentence-kana" ||
    type === "sentence-cloze" ||
    type === "sentence-cloze-furigana"
  ) {
    const isCloze = type === "sentence-cloze" || type === "sentence-cloze-furigana";
    const options: AnkiTemplateFieldSentenceOptions = {
      style: type === "sentence-furigana" || type === "sentence-cloze-furigana" ?
        "furigana-anki" :
        type === "sentence-kana" ?
        "kana-only" :
        "basic",
      word: isCloze ? "cloze" : "bold",
    };
    return {
      name,
      content: "sentence",
      ...options,
    };
  } else if (
    type === "meaning" ||
    type === "meaning-full" ||
    type === "meaning-short"
  ) {
    return {
      ...newAnkiTemplateField(name, "meaning"),
      full_format: type === "meaning-short" ? "line" : "numbered",
    };
  } else if (
    type === "translated-sentence" ||
    type === "url" ||
    type === "link"
  ) {
    return {
      name,
      content: type,
    };
  } else {
    console.error(`Invalid Anki field template type '${type}' encountered for field: '${name}'`);
    return {
      name,
      content: "",
    };
  }
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
    console.error(`Invalid Anki template field type '${content}'`);
    return {
      name,
      content: "",
    };
  }
}
