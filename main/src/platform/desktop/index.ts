import { BrowserApi } from "~/extension/browserApi";
import type { Module, TTSVoice, VersionInfo } from "../common";
import { type StoredConfiguration } from "~/config";
import type { TranslateResult } from "../common/translate";
import { getTranslation } from "../common/translate";

export * from "../common/translate";

export namespace Platform {
  export const IS_DESKTOP = true;
  export const IS_IOS = false;
  export const IS_IOSAPP = false;

  let browserApi: BrowserApi

  export function initialize(browserApiParam: BrowserApi) { 
    browserApi = browserApiParam
  }

  export async function getConfig(): Promise<StoredConfiguration> {
    return await browserApi.getStorage<StoredConfiguration>("config", {});
  }

  /** subscriber is called when config is changed. */
  export function subscribeConfig(subscriber: (config: StoredConfiguration) => void): void {
    browserApi.handleStorageChange("config", (change) => {
      subscriber(change.newValue)
    })
  }

  export function saveConfig(config: StoredConfiguration): Promise<void> {
    return browserApi.setStorage("config", config);
  }

  export function openOptionsPage() {
    chrome.runtime.openOptionsPage();
  }

  export async function versionInfo(): Promise<VersionInfo> {
    const manifest = browserApi.manifest();
    return {
      version: manifest.version
    }
  }

  /** This function is and only should be called in options page */
  export async function japaneseTTSVoices(): Promise<TTSVoice[]> {
    return browserApi.japaneseTtsVoices()
  }

  export async function playTTS(text: string): Promise<void> {
    if (browserApi.context === "contentScript") {
      await browserApi.request("tts", text);
    } else {
      browserApi.speakJapanese(text);
    }
  }

  export async function translate(text: string): Promise<TranslateResult> {
    if (browserApi.context !== "contentScript") {
      return getTranslation(text)
    } else {
      return browserApi.request("translate", text);
    }
  }

  export function openExternalLink(url: string): void {
    window
      .open(url, "_blank")
      ?.focus();
  }
}

Platform satisfies Module;
