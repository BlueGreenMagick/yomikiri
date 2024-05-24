/*
Migrate config objects created in previous versions.

The migration is initiated by `Platform`.
In extension, the migration runs only once in background context.
In iosapp, migration may run multiple times in each page,
but it is commited only once.

When `Configuration` structure is modified, `config_version` is incremented.

Configurations are backwards-compatible to best efforts.
Existing keys are not re-used for different meaning, or deleted.
Instead, a new key is always created.
And if needed, value is transformed and moved from existing key.
*/

import { CONFIG_VERSION, type Configuration, type StoredConfiguration } from "./config";
import { type AnkiTemplate, type AnkiTemplateField, type Field, type AnkiTemplateFieldSentenceOptions, type AnkiTemplateFieldWordOptions, type AnkiNote } from "./anki";
import { VERSION } from "common";

interface DeprecatedConfiguration {
  /** Deprecated in conf v3 */
  "anki.template": AnkiNote | null;
}

/* Ensure that no keys overlap between Configuration and Deprecated Configuration */
type OverlappingKeys<A, B> = keyof A & keyof B
type NoOverlappingKeys<A, B> = OverlappingKeys<A, B> extends never ? object : { overlap: OverlappingKeys<A, B> };
const _checkOverlap: NoOverlappingKeys<Configuration, DeprecatedConfiguration> = {};


/* Configurations of previous versions */

/** v0.2.0-dev */
type Configuration_2_Conf = Configuration_1_Conf
type Configuration_2 = Configuration_2_Conf & { config_version: 2 }

/** 
 * v0.1.0 - 0.1.3 
 * In these versions, 'config_version' did not exist yet.
*/
type Configuration_1_Conf = Pick<Configuration,
  "state.enabled"
  | "general.font_size"
  | "general.font"
  | "anki.connect_port"
  | "anki.connect_url"
  | "anki.enabled"
  | "anki.ios_auto_redirect"
  | "tts.voice"
  | "version">
  & Pick<DeprecatedConfiguration, "anki.template">

type Configuration_1 = Configuration_1_Conf & { config_version?: undefined }

interface Configuration_New {
  config_version?: undefined
  version?: undefined
}


/* Stored & Misc Configuration Types */

interface ConfigBase {
  config_version?: number | undefined
  version?: string | undefined
}

export type StoredConfig<C extends ConfigBase> = Partial<C> & Pick<C, "config_version" | "version">

interface Configurations { 0: Configuration_New, 1: Configuration_1, 2: Configuration_2, 3: Configuration }

export type CompatConfiguration = Configurations[keyof Configurations]
export type StoredCompatConfiguration = { [K in keyof Configurations]: StoredConfig<Configurations[K]> }[keyof Configurations]


/* Migration code */


/** 
 * Don't call this function directly. Instead, call `migrateIfNeeded()`. 
 * 
 * This function is called by `platform.migrateConfig()`
*/
export function migrateConfigObject(config: StoredCompatConfiguration): StoredConfiguration {
  if (config.config_version !== undefined && config.config_version > CONFIG_VERSION) {
    // if config was created in future version,
    // try using as-is as it's mostly backwards-compatible
    console.error(`Encountered future config_version '${config.config_version}'. Current CONFIG_VERSION is '${CONFIG_VERSION}'. Using config as-is. Unexpected error may occur.`)
    return config as StoredConfiguration
  } else if (config.config_version === CONFIG_VERSION) {
    return config
  } else if (config.config_version === undefined && config.version === undefined) {
    return {
      config_version: CONFIG_VERSION,
      version: VERSION
    }
  }

  if (config.config_version === undefined) {
    console.debug(`Migrating config object from v1 to v2`)
    config = migrateConfiguration_1(config)
  }
  if (config.config_version === 2) {
    console.debug(`Migrating config object from v2 to v3`)
    config = migrateConfiguration_2(config)
  }

  return config
}

function migrateConfiguration_1(config: StoredConfig<Configuration_1>): StoredConfig<Configuration_2> {
  return {
    ...config,
    config_version: 2
  }
}

function migrateConfiguration_2(config: StoredConfig<Configuration_2>): StoredConfig<Configuration> {
  const newConfig = {
    ...config,
    config_version: 3
  } as StoredConfig<Configuration>


  const ankiTemplate = config["anki.template"]
  if (ankiTemplate !== undefined && ankiTemplate !== null) {
    newConfig["anki.anki_template"] = migrateAnkiTemplate_2(ankiTemplate)
  }

  return newConfig
}

function migrateAnkiTemplate_2(template: AnkiNote): AnkiTemplate {
  return {
    ...template,
    fields: template.fields.map(fieldTemplateToAnyFieldTemplate)
  }
}

export function fieldTemplateToAnyFieldTemplate(fld: Field): AnkiTemplateField {
  const type = fld.value
  const name = fld.name
  if (type === "") {
    return {
      name,
      content: type
    }
  } else if (
    ["word", "word-furigana", "word-kana"].includes(type)) {
    const options: AnkiTemplateFieldWordOptions = {
      form: "as-is",
      style: type === "word-furigana" ? "furigana-anki"
        : type === "word-kana" ? "kana-only"
          : "basic",
    }
    return {
      name, content: "word", ...options
    }
  } else if (type === "dict" || type === "dict-furigana" || type === "dict-kana") {
    const options: AnkiTemplateFieldWordOptions = {
      form: "dict-form",
      style: type === "dict-furigana" ? "furigana-anki"
        : type === "dict-kana" ? "kana-only"
          : "basic",
    }
    return { name, content: "word", ...options }
  } else if (type === "main-dict" || type === "main-dict-furigana" || type === "main-dict-kana") {
    const options: AnkiTemplateFieldWordOptions = {
      form: "main-dict-form",
      style: type === "main-dict-furigana" ? "furigana-anki"
        : type === "main-dict-kana" ? "kana-only"
          : "basic",
    }
    return {
      name,
      content: "word",
      ...options
    }
  } else if (
    type === "sentence" ||
    type === "sentence-furigana" ||
    type === "sentence-kana" ||
    type === "sentence-cloze" ||
    type === "sentence-cloze-furigana"
  ) {
    const isCloze = type === "sentence-cloze" || type === "sentence-cloze-furigana"
    const options: AnkiTemplateFieldSentenceOptions = {
      style: (type === "sentence-furigana" || type === "sentence-cloze-furigana") ? "furigana-anki" : type === "sentence-kana" ? "kana-only" : "basic",
      word: isCloze ? "cloze" : "bold"
    }
    return {
      name,
      content: "sentence",
      ...options
    }
  } else if (type === "meaning" || type === "meaning-full" || type === "meaning-short") {
    return {
      name,
      content: "meaning",
      format: type === "meaning-short" ? "short" : "default"
    }
  } else if (type === "translated-sentence" || type === "url" || type === "link") {
    return {
      name,
      content: type,
    }
  } else {
    throw new Error(`Invalid Anki field template type '${type}' encountered for field: '${name}'`)
  }
}