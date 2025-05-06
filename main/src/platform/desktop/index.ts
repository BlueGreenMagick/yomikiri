import {
  NonContentScriptFunction,
  extensionManifest,
  getStorage,
  handleStorageChange,
  japaneseTtsVoices,
  setStorage,
  speakJapanese,
} from "@/features/extension/browserApi";
import type { IPlatform, TTSVoice, VersionInfo } from "../types";
import { type StoredConfiguration } from "@/features/config";
import { getTranslation } from "../shared/translate";
import {
  migrateConfigObject,
  type StoredCompatConfiguration,
} from "@/features/compat";
import { LazyAsync } from "@/features/utils";
import { deleteSavedDictionary } from "./dictionary";
import { DesktopAnkiApi } from "./anki";
import { DesktopBackend } from "./backend";

export * from "../types";

export class _DesktopPlatform implements IPlatform {
  readonly type = "desktop";
  readonly anki = DesktopAnkiApi;
  readonly backend = DesktopBackend;

  // config migration is done only once even if requested multiple times
  private readonly configMigration = new LazyAsync<StoredConfiguration>(
    async () => {
      return await this.migrateConfigInner();
    },
  );

  async getConfig(): Promise<StoredCompatConfiguration> {
    return await getStorage("config", {});
  }

  /** subscriber is called when config is changed. */
  subscribeConfig(subscriber: (config: StoredConfiguration) => void): void {
    handleStorageChange("config", (change) => {
      subscriber(change.newValue as StoredConfiguration);
    });
  }

  saveConfig(config: StoredConfiguration): Promise<void> {
    console.debug("config saved");
    return setStorage("config", config);
  }

  openOptionsPage(): Promise<void> {
    return chrome.runtime.openOptionsPage();
  }

  versionInfo(): VersionInfo {
    const manifest = extensionManifest();
    return {
      version: manifest.version,
    };
  }

  /** This function is and only should be called in options page */
  async japaneseTTSVoices(): Promise<TTSVoice[]> {
    return japaneseTtsVoices();
  }

  readonly playTTS = NonContentScriptFunction(
    "tts",
    async ({ text, voice }) => {
      await speakJapanese(text, voice);
    },
  );

  readonly translate = NonContentScriptFunction("translate", getTranslation);

  openExternalLink(url: string): void {
    window.open(url, "_blank")?.focus();
  }

  readonly migrateConfig = NonContentScriptFunction(
    "migrateConfig",
    async () => {
      return await this.configMigration.get();
    },
  );

  async migrateConfigInner(): Promise<StoredConfiguration> {
    const configObject = await this.getConfig();
    const migrated = migrateConfigObject(configObject);
    await this.saveConfig(migrated);
    return migrated;
  }

  async deleteDictionary() {
    return deleteSavedDictionary();
  }
}

export const DesktopPlatform = new _DesktopPlatform();
export const Platform = DesktopPlatform;
export const ExtensionPlatform = Platform;
export const PagePlatform = Platform;

export type DesktopPlatform = typeof DesktopPlatform;
export type Platform = DesktopPlatform;
