import type { ConfigurationV2 } from "../types/typesV2";
import type {
  AnkiNoteV3,
  AnkiTemplateFieldContentV3,
  AnkiTemplateFieldSentenceOptionsV3,
  AnkiTemplateFieldTypesV3,
  AnkiTemplateFieldV3,
  AnkiTemplateFieldWordOptionsV3,
  AnkiTemplateV3,
  ConfigurationV3,
  FieldV3,
} from "../types/typesV3";
import type { StoredConfig } from "./types";

export function migrateConfiguration_2(
  config: StoredConfig<ConfigurationV2>,
): StoredConfig<ConfigurationV3> {
  const newConfig = {
    ...config,
    config_version: 3,
  } as StoredConfig<ConfigurationV3>;

  const ankiTemplate = config["anki.template"];
  if (ankiTemplate !== undefined && ankiTemplate !== null) {
    newConfig["anki.anki_template"] = migrateAnkiTemplate_2(ankiTemplate);
  }

  return newConfig;
}

function migrateAnkiTemplate_2(template: AnkiNoteV3): AnkiTemplateV3 {
  return {
    ...template,
    fields: template.fields.map(fieldTemplateToAnyFieldTemplate),
  };
}

export function fieldTemplateToAnyFieldTemplate(fld: FieldV3): AnkiTemplateFieldV3 {
  const type = fld.value;
  const name = fld.name;
  if (type === "") {
    return {
      name,
      content: type,
    };
  } else if (["word", "word-furigana", "word-kana"].includes(type)) {
    const options: AnkiTemplateFieldWordOptionsV3 = {
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
    const options: AnkiTemplateFieldWordOptionsV3 = {
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
    const options: AnkiTemplateFieldWordOptionsV3 = {
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
    const options: AnkiTemplateFieldSentenceOptionsV3 = {
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

export function newAnkiTemplateField<C extends AnkiTemplateFieldContentV3>(
  name: string,
  content: C,
): AnkiTemplateFieldTypesV3[C];
export function newAnkiTemplateField(
  name: string,
  content: AnkiTemplateFieldContentV3,
): AnkiTemplateFieldV3 {
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
