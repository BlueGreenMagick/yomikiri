import {
  extensionManifest,
  getStorage,
  handleStorageChange,
  japaneseTtsVoices,
  message,
  setStorage,
  speakJapanese,
} from "extension/browserApi";
import type { IPlatform, TTSVoice, VersionInfo } from "../common";
import { type Config, type StoredConfiguration } from "lib/config";
import type { TranslateResult } from "../common/translate";
import { getTranslation } from "../common/translate";
import { Backend as DesktopBackend } from "./backend";
import {
  migrateConfigObject,
  type StoredCompatConfiguration,
} from "lib/compat";
import { LazyAsync } from "lib/utils";
import { EXTENSION_CONTEXT } from "consts";
import { DesktopDictionary } from "./dictionary";
import { DesktopAnkiApi } from "./anki";

export * from "../common";

export namespace DesktopPlatform {
  export const IS_DESKTOP = true;
  export const IS_IOS = false;
  export const IS_IOSAPP = false;

  // config migration is done only once even if requested multiple times
  const configMigration = new LazyAsync<StoredConfiguration>(async () => {
    return await migrateConfigInner();
  });
  export const backend: LazyAsync<DesktopBackend> = new LazyAsync(() => {
    return DesktopBackend.initialize();
  });

  export async function newBackend(): Promise<DesktopBackend> {
    return await backend.get();
  }

  export async function newDictionary(): Promise<DesktopDictionary> {
    const b = await backend.get();
    return new DesktopDictionary(b);
  }

  export function newAnkiApi(config: Config): DesktopAnkiApi {
    return new DesktopAnkiApi(config);
  }

  export async function getConfig(): Promise<StoredCompatConfiguration> {
    return await getStorage<StoredCompatConfiguration>("config", {});
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

  export async function playTTS(
    text: string,
    voice: TTSVoice | null,
  ): Promise<void> {
    if (EXTENSION_CONTEXT === "contentScript") {
      await message("tts", { voice, text });
    } else {
      await speakJapanese(text, voice);
    }
  }

  export async function translate(text: string): Promise<TranslateResult> {
    if (EXTENSION_CONTEXT !== "contentScript") {
      return getTranslation(text);
    } else {
      return message("translate", text);
    }
  }

  export function openExternalLink(url: string): void {
    window.open(url, "_blank")?.focus();
  }

  export async function migrateConfig(): Promise<StoredConfiguration> {
    if (EXTENSION_CONTEXT === "contentScript") {
      return await message("migrateConfig", null);
    } else {
      return await configMigration.get();
    }
  }

  async function migrateConfigInner(): Promise<StoredConfiguration> {
    const configObject = await getConfig();
    const migrated = migrateConfigObject(configObject);
    await saveConfig(migrated);
    return migrated;
  }
}

DesktopPlatform satisfies IPlatform;

export const Platform = DesktopPlatform;
export const ExtensionPlatform = Platform;
