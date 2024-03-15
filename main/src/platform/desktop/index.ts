import { BrowserApi } from "~/extension/browserApi";
import type { Module, TTSVoice, VersionInfo } from "../common";
import { Config, type StoredConfiguration } from "~/config";
import { PLATFORM } from "~/generated";
import type { TranslateResult } from "../common/translate";
import { getTranslation } from "../common/translate";

export * from "../common/translate";

export namespace Platform {
  export const IS_DESKTOP = true;
  export const IS_IOS = false;
  export const IS_IOSAPP = false;

  export function initialize() { }

  export async function getConfig(): Promise<StoredConfiguration> {
    return await BrowserApi.getStorage<StoredConfiguration>("config", {});
  }

  /** subscriber is called when config is changed. */
  export function subscribeConfig(subscriber: (config: StoredConfiguration) => any): void {
    BrowserApi.handleStorageChange("config", (change) => {
      subscriber(change.newValue)
    })
  }

  export function saveConfig(config: StoredConfiguration): Promise<void> {
    return BrowserApi.setStorage("config", config);
  }

  export function openOptionsPage() {
    chrome.runtime.openOptionsPage();
  }

  export async function versionInfo(): Promise<VersionInfo> {
    const manifest = BrowserApi.manifest();
    return {
      version: manifest.version
    }
  }

  /** This function is and only should be called in options page */
  export async function japaneseTTSVoices(): Promise<TTSVoice[]> {
    return BrowserApi.japaneseTtsVoices()
  }

  export async function playTTS(text: string): Promise<void> {
    if (BrowserApi.context === "contentScript") {
      await BrowserApi.request("tts", text);
    } else {
      BrowserApi.speakJapanese(text);
    }
  }

  export async function translate(text: string): Promise<TranslateResult> {
    if (BrowserApi.context !== "contentScript") {
      return getTranslation(text)
    } else {
      return BrowserApi.request("translate", text);
    }
  }

  export function openExternalLink(url: string): void {
    window
      .open(url, "_blank")
      ?.focus();
  }
}

Platform satisfies Module;
