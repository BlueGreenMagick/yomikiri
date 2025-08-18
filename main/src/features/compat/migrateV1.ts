import { VERSION } from "@/consts";
import type {
  AnkiNoteV1,
  AnkiTemplateFieldContentV1,
  AnkiTemplateFieldSentenceOptionsV1,
  AnkiTemplateFieldTypesV1,
  AnkiTemplateFieldV1,
  AnkiTemplateFieldWordOptionsV1,
  AnkiTemplateV1,
  FieldV1,
  StoredConfiguration1V1,
  StoredConfiguration2V1,
  StoredConfiguration3V1,
  StoredConfigurationV1,
} from "./types/typesV1";
import type { StoredConfigurationV2 } from "./types/typesV2";

export interface MigrateV1Props {
  config: StoredConfigurationV1;
}

export interface MigrateV1Result {
  config: StoredConfigurationV2;
}

export function migrateV1({ config }: MigrateV1Props): MigrateV1Result {
  if (
    config.config_version !== undefined &&
    config.config_version > 3
  ) {
    throw new Error(
      `Expected config_version to be less than 3, but received: ${config.config_version}`,
    );
  } else if (config.config_version === 3) {
    return { config };
  } else if (
    config.config_version === undefined &&
    config.version === undefined
  ) {
    const config = {
      config_version: 3,
      version: VERSION,
    } as const;
    return { config };
  }

  if (config.config_version === undefined) {
    console.debug(`Migrating config object from v1 to v2`);
    config = migrateConfig1(config);
  }
  if (config.config_version === 2) {
    console.debug(`Migrating config object from v2 to v3`);
    config = migrateConfig2(config);
  }

  return { config };
}

function migrateConfig1(config: StoredConfiguration1V1): StoredConfiguration2V1 {
  return {
    ...config,
    config_version: 2,
  };
}

function migrateConfig2(
  config: StoredConfiguration2V1,
): StoredConfiguration3V1 {
  const newConfig = {
    ...config,
    config_version: 3,
  } as StoredConfiguration3V1;

  const ankiTemplate = config["anki.template"];
  if (ankiTemplate !== undefined && ankiTemplate !== null) {
    newConfig["anki.anki_template"] = migrateAnkiTemplate_2(ankiTemplate);
  }

  return newConfig;
}

function migrateAnkiTemplate_2(template: AnkiNoteV1): AnkiTemplateV1 {
  return {
    ...template,
    fields: template.fields.map(fieldTemplateToAnyFieldTemplate),
  };
}

export function fieldTemplateToAnyFieldTemplate(fld: FieldV1): AnkiTemplateFieldV1 {
  const type = fld.value;
  const name = fld.name;
  if (type === "") {
    return {
      name,
      content: type,
    };
  } else if (["word", "word-furigana", "word-kana"].includes(type)) {
    const options: AnkiTemplateFieldWordOptionsV1 = {
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
    const options: AnkiTemplateFieldWordOptionsV1 = {
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
    const options: AnkiTemplateFieldWordOptionsV1 = {
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
    const options: AnkiTemplateFieldSentenceOptionsV1 = {
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

export function newAnkiTemplateField<C extends AnkiTemplateFieldContentV1>(
  name: string,
  content: C,
): AnkiTemplateFieldTypesV1[C];
export function newAnkiTemplateField(
  name: string,
  content: AnkiTemplateFieldContentV1,
): AnkiTemplateFieldV1 {
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
