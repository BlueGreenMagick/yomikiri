import type { Platform, TTSVoice } from "@platform";
import { CONFIG_VERSION, type Configuration, type StoredConfiguration } from "./config";
import type { NoteData } from "./anki";

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


  // if configVersion > CONFIG_VERSION
  throw new Error(`Encountered future configVersion: ${configVersion}`)
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
