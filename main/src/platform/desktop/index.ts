import { BrowserApi } from "~/extension/browserApi";
import type { IPlatform, IPlatformStatic, TTSVoice, VersionInfo } from "../common";
import Config, { type StoredConfiguration } from "~/config";
import type { TranslateResult } from "../common/translate";
import { getTranslation } from "../common/translate";
import { Backend as DesktopBackend } from "./backend"
import { Dictionary as DesktopDictionary } from "./dictionary"
import { AnkiApi as DesktopAnkiApi } from "./anki";

export * from "../common";

class DesktopPlatform implements IPlatform {
  static IS_DESKTOP = true
  static IS_IOS = false
  static IS_IOSAPP = false

  browserApi: BrowserApi

  constructor(browserApi: BrowserApi) {
    this.browserApi = browserApi
  }

  async newBackend(): Promise<DesktopBackend> {
    return await DesktopBackend.initialize(this.browserApi)
  }

  newDictionary(): DesktopDictionary {
    return new DesktopDictionary()
  }

  newAnkiApi(config: Config): DesktopAnkiApi {
    return new DesktopAnkiApi(this, config)
  }

  async getConfig(): Promise<StoredConfiguration> {
    return await this.browserApi.getStorage<StoredConfiguration>("config", {});
  }

  /** subscriber is called when config is changed. */
  subscribeConfig(subscriber: (config: StoredConfiguration) => void): void {
    this.browserApi.handleStorageChange("config", (change) => {
      subscriber(change.newValue)
    })
  }

  saveConfig(config: StoredConfiguration): Promise<void> {
    return this.browserApi.setStorage("config", config);
  }

  openOptionsPage() {
    chrome.runtime.openOptionsPage();
  }

  async versionInfo(): Promise<VersionInfo> {
    const manifest = this.browserApi.manifest();
    return {
      version: manifest.version
    }
  }

  /** This function is and only should be called in options page */
  async japaneseTTSVoices(): Promise<TTSVoice[]> {
    return this.browserApi.japaneseTtsVoices()
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
      return getTranslation(text)
    } else {
      return this.browserApi.request("translate", text);
    }
  }

  openExternalLink(url: string): void {
    window
      .open(url, "_blank")
      ?.focus();
  }
}

DesktopPlatform satisfies IPlatformStatic

// We set unique name for each platform class then rename to common name
// for easier type debugging during development
export const Platform = DesktopPlatform
export type Platform = DesktopPlatform