import {
  BrowserApi,
  extensionManifest,
  japaneseTtsVoices,
  message,
  speakJapanese,
} from "extension/browserApi";
import type {
  IPlatform,
  IPlatformStatic,
  TTSVoice,
  VersionInfo,
} from "../common";
import Config, { type StoredConfiguration } from "lib/config";
import type { TranslateResult } from "../common/translate";
import { getTranslation } from "../common/translate";
import { Backend as DesktopBackend } from "./backend";
import { Dictionary as DesktopDictionary } from "./dictionary";
import { AnkiApi as DesktopAnkiApi } from "./anki";
import {
  migrateConfigObject,
  type StoredCompatConfiguration,
} from "lib/compat";
import { LazyAsync } from "lib/utils";
import { EXTENSION_CONTEXT } from "consts";

export * from "../common";

export class DesktopPlatform implements IPlatform {
  static IS_DESKTOP = true;
  static IS_IOS = false;
  static IS_IOSAPP = false;

  browserApi: BrowserApi;
  // config migration is done only once even if requested multiple times
  configMigration = new LazyAsync<StoredConfiguration>(async () => {
    return await this.migrateConfigInner();
  });
  backend: LazyAsync<DesktopBackend> = new LazyAsync(() => {
    return DesktopBackend.initialize(this.browserApi);
  });

  constructor(browserApi: BrowserApi) {
    this.browserApi = browserApi;
  }

  async newBackend(): Promise<DesktopBackend> {
    return await this.backend.get();
  }

  async newDictionary(): Promise<DesktopDictionary> {
    const backend = await this.backend.get();
    return new DesktopDictionary(this.browserApi, backend);
  }

  newAnkiApi(config: Config): DesktopAnkiApi {
    return new DesktopAnkiApi(this, config);
  }

  async getConfig(): Promise<StoredCompatConfiguration> {
    return await this.browserApi.getStorage<StoredCompatConfiguration>(
      "config",
      {},
    );
  }

  /** subscriber is called when config is changed. */
  subscribeConfig(subscriber: (config: StoredConfiguration) => void): void {
    this.browserApi.handleStorageChange("config", (change) => {
      subscriber(change.newValue as StoredConfiguration);
    });
  }

  saveConfig(config: StoredConfiguration): Promise<void> {
    console.debug("config saved");
    return this.browserApi.setStorage("config", config);
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

  async playTTS(text: string, voice: TTSVoice | null): Promise<void> {
    if (EXTENSION_CONTEXT === "contentScript") {
      await message("tts", { voice, text });
    } else {
      await speakJapanese(text, voice);
    }
  }

  async translate(text: string): Promise<TranslateResult> {
    if (EXTENSION_CONTEXT !== "contentScript") {
      return getTranslation(text);
    } else {
      return message("translate", text);
    }
  }

  openExternalLink(url: string): void {
    window.open(url, "_blank")?.focus();
  }

  async migrateConfig(): Promise<StoredConfiguration> {
    if (EXTENSION_CONTEXT === "contentScript") {
      return await message("migrateConfig", null);
    } else {
      return await this.configMigration.get();
    }
  }

  private async migrateConfigInner(): Promise<StoredConfiguration> {
    const configObject = await this.getConfig();
    const migrated = migrateConfigObject(configObject);
    await this.saveConfig(migrated);
    return migrated;
  }
}

DesktopPlatform satisfies IPlatformStatic;

export const Platform = DesktopPlatform;
export type Platform = DesktopPlatform;
