/*
Migrate config objects created in previous versions.

When `Configuration` structure is modified, `config_version` is incremented.

Configurations are backwards-compatible to best efforts.
Existing keys are not re-used for different meaning, or deleted.
Instead, a new key is always created.
And if needed, value is transformed and moved from existing key.
*/


import type { Platform, TTSVoice } from "@platform";
import { CONFIG_VERSION, type Configuration, type StoredConfiguration } from "./config";
import { type AnyAnkiTemplateField, type Field, type FieldSentenceOptions, type FieldWordOptions, type NoteData } from "./anki";

/** 
 * v0.1.0 - 0.1.3 
 * In these versions, 'config_version' did not exist yet.
*/
interface Configuration_1 {
  "state.enabled": boolean;
  "general.font_size": number;
  "general.font": string;
  "anki.connect_port": number;
  "anki.connect_url": string;
  "anki.template": NoteData | null;
  "anki.enabled": boolean;
  /** On ios, if auto redirect back to safari */
  "anki.ios_auto_redirect": boolean;
  /** set to null if voice is not available */
  "tts.voice": TTSVoice | null;
  /** Yomikiri semantic version on last config save */
  "version": string
  /** This property was not defined in this config */
  "config_version"?: undefined
}

export type CompatConfiguration = Configuration | Configuration_1 | Record<string, never>
export type StoredCompatConfiguration = Partial<CompatConfiguration>

export async function migrateIfNeeded(platform: Platform, configObject: StoredCompatConfiguration): Promise<StoredConfiguration> {
  const configVersion = getConfigVersion(configObject)
  if (configVersion === CONFIG_VERSION) {
    return configObject as StoredConfiguration
  }

  return await platform.migrateConfig()
}

/** Don't call this function directly. Instead, call `migrateIfNeeded()`. */
export function migrateConfigObject(configObject: StoredCompatConfiguration): StoredConfiguration {
  const configVersion = getConfigVersion(configObject)
  console.debug(`Migrating config object from '${configVersion}' to '${CONFIG_VERSION}'`)

  if (configVersion === CONFIG_VERSION) {
    return configObject as StoredConfiguration
  }

  // new config
  if (configVersion === -1) {
    return {
      config_version: CONFIG_VERSION
    }
  }

  if (configVersion === 1) {
    return {
      ...(configObject as Configuration_1),
      config_version: CONFIG_VERSION
    }
  }


  // if config was created in future version,
  // try using as-is as it's mostly backwards-compatible
  console.error(`Encountered future configVersion: ${configVersion}. Using the config as-is. Unexpected error may occur.`)
  return configObject as StoredConfiguration
}


/** 
 * Returns -1 for initial app install before any config saves.
 * 
 * Returns 1 for v0.1.0-0.1.3 config before "config_version" key was introduced
 */
function getConfigVersion(configObject: StoredCompatConfiguration): number {
  const configVersion = configObject["config_version"]
  if (configVersion !== undefined) return configVersion
  // in v0.1.0-0.1.3, "config_version" key did not exist, but "version" key was mandatory.
  if (configObject["version"] !== undefined) return 1
  return -1
}

export function fieldTemplateToAnyFieldTemplate(fld: Field): AnyAnkiTemplateField {
  const type = fld.value
  const field = fld.name
  if (type === "") {
    return {
      field,
      type,
      options: {}
    }
  } else if (
    ["word", "word-furigana", "word-kana"].includes(type)) {
    const options: FieldWordOptions = {
      form: "as-is",
      style: type === "word-furigana" ? "furigana-anki"
        : type === "word-kana" ? "kana-only"
          : "basic",
    }
    return {
      field, type: "word", options
    }
  } else if (type === "dict" || type === "dict-furigana" || type === "dict-kana") {
    const options: FieldWordOptions = {
      form: "dict-form",
      style: type === "dict-furigana" ? "furigana-anki"
        : type === "dict-kana" ? "kana-only"
          : "basic",
    }
    return { field, type: "word", options }
  } else if (type === "main-dict" || type === "main-dict-furigana" || type === "main-dict-kana") {
    const options: FieldWordOptions = {
      form: "main-dict-form",
      style: type === "main-dict-furigana" ? "furigana-anki"
        : type === "main-dict-kana" ? "kana-only"
          : "basic",
    }
    return {
      field,
      type: "word",
      options: options
    }
  } else if (
    type === "sentence" ||
    type === "sentence-furigana" ||
    type === "sentence-kana" ||
    type === "sentence-cloze" ||
    type === "sentence-cloze-furigana"
  ) {
    const isCloze = type === "sentence-cloze" || type === "sentence-cloze-furigana"
    const options: FieldSentenceOptions = {
      style: (type === "sentence-furigana" || type === "sentence-cloze-furigana") ? "furigana-anki" : type === "sentence-kana" ? "kana-only" : "basic",
      word: isCloze ? "cloze" : "bold"
    }
    return {
      field,
      type: "sentence",
      options
    }
  } else if (type === "meaning" || type === "meaning-full" || type === "meaning-short") {
    return {
      field, type: "meaning", options: { format: type === "meaning-short" ? "short" : "default" }
    }
  } else if (type === "translated-sentence" || type === "url" || type === "link") {
    return {
      field,
      type: type as "translated-sentence" || "url" || "link",
      options: {}
    }
  } else {
    throw new Error(`Invalid Anki field template type '${type}' encountered for field: '${field}'`)
  }
}