import {
  type AnkiNote,
  type AnkiTemplate,
  type AnkiTemplateField,
  type AnkiTemplateFieldSentenceOptions,
  type AnkiTemplateFieldWordOptions,
  type Field,
  newAnkiTemplateField,
} from "@/features/anki";
import type { Configuration } from "@/features/config";
import { YomikiriError } from "@/features/error";
import type { StoredConfig } from "./shared";
import type { Configuration_1_Conf } from "./v1";

/** v0.2.0-dev */
export type Configuration_2_Conf = Configuration_1_Conf;
export type Configuration_2 = Configuration_2_Conf & { config_version: 2 };

export function migrateConfiguration_2(
  config: StoredConfig<Configuration_2>,
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
    throw new YomikiriError(
      `Invalid Anki field template type '${type}' encountered for field: '${name}'`,
    );
  }
}
