import {
  NonContentScriptFunction,
  extensionManifest,
  getStorage,
  handleStorageChange,
  japaneseTtsVoices,
  setStorage,
  speakJapanese,
} from "@/lib/extension/browserApi";
import type { IPlatform, TTSVoice, VersionInfo } from "../common";
import { type StoredConfiguration } from "@/lib/config";
import { getTranslation } from "../common/translate";
import {
  migrateConfigObject,
  type StoredCompatConfiguration,
} from "@/lib/compat";
import { LazyAsync } from "@/lib/utils";
import { deleteSavedDictionary } from "./dictionary";

export * from "../common";

export namespace DesktopPlatform {
  export const IS_DESKTOP = true;
  export const IS_IOS = false;
  export const IS_IOSAPP = false;
  export const IS_ANDROID = false;

  // config migration is done only once even if requested multiple times
  const configMigration = new LazyAsync<StoredConfiguration>(async () => {
    return await migrateConfigInner();
  });

  export async function getConfig(): Promise<StoredCompatConfiguration> {
    return await getStorage("config", {});
  }

  /** subscriber is called when config is changed. */
  export function subscribeConfig(
    subscriber: (config: StoredConfiguration) => void,
  ): void {
    handleStorageChange("config", (change) => {
      subscriber(change.newValue as StoredConfiguration);
    });
  }

  export function saveConfig(config: StoredConfiguration): Promise<void> {
    console.debug("config saved");
    return setStorage("config", config);
  }

  export function openOptionsPage(): Promise<void> {
    return chrome.runtime.openOptionsPage();
  }

  export function versionInfo(): VersionInfo {
    const manifest = extensionManifest();
    return {
      version: manifest.version,
    };
  }

  /** This function is and only should be called in options page */
  export async function japaneseTTSVoices(): Promise<TTSVoice[]> {
    return japaneseTtsVoices();
  }

  export const playTTS = NonContentScriptFunction(
    "tts",
    async ({ text, voice }) => {
      await speakJapanese(text, voice);
    },
  );

  export const translate = NonContentScriptFunction(
    "translate",
    getTranslation,
  );

  export function openExternalLink(url: string): void {
    window.open(url, "_blank")?.focus();
  }

  export const migrateConfig = NonContentScriptFunction(
    "migrateConfig",
    async () => {
      return await configMigration.get();
    },
  );

  async function migrateConfigInner(): Promise<StoredConfiguration> {
    const configObject = await getConfig();
    const migrated = migrateConfigObject(configObject);
    await saveConfig(migrated);
    return migrated;
  }

  export async function deleteDictionary() {
    return deleteSavedDictionary();
  }
}

DesktopPlatform satisfies IPlatform;

export const Platform = DesktopPlatform;
export const ExtensionPlatform = Platform;
export const PagePlatform = Platform;
