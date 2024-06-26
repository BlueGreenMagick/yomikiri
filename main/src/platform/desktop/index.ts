import { BrowserApi } from "extension/browserApi";
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

  constructor(browserApi: BrowserApi) {
    this.browserApi = browserApi;
  }

  async newBackend(): Promise<DesktopBackend> {
    return await DesktopBackend.initialize(this.browserApi);
  }

  newDictionary(): DesktopDictionary {
    return new DesktopDictionary();
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
    const manifest = this.browserApi.manifest();
    return {
      version: manifest.version,
    };
  }

  /** This function is and only should be called in options page */
  async japaneseTTSVoices(): Promise<TTSVoice[]> {
    return this.browserApi.japaneseTtsVoices();
  }

  async playTTS(text: string, voice: TTSVoice | null): Promise<void> {
    if (this.browserApi.context === "contentScript") {
      await this.browserApi.request("tts", { voice, text });
    } else {
      await this.browserApi.speakJapanese(text, voice);
    }
  }

  async translate(text: string): Promise<TranslateResult> {
    if (this.browserApi.context !== "contentScript") {
      return getTranslation(text);
    } else {
      return this.browserApi.request("translate", text);
    }
  }

  openExternalLink(url: string): void {
    window.open(url, "_blank")?.focus();
  }

  async migrateConfig(): Promise<StoredConfiguration> {
    if (this.browserApi.context === "contentScript") {
      return await this.browserApi.request("migrateConfig", null);
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
