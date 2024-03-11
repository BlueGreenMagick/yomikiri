import { BrowserApi } from "~/extension/browserApi";
import type { Module, VersionInfo } from "../common";
import type { StoredConfiguration } from "~/config";
import { PLATFORM } from "~/generated";
import type { TranslateResult } from "../common/translate";
import { getTranslation } from "../common/translate";

export * from "../common/translate";

export namespace Platform {
  export const IS_DESKTOP = true;
  export const IS_IOS = false;
  export const IS_IOSAPP = false;

  export function initialize() { }

  export function loadConfig(): Promise<StoredConfiguration> {
    return BrowserApi.getStorage<StoredConfiguration>("config", {});
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

  export function hasTTS(): boolean {
    return (PLATFORM === "chrome")
  }

  export async function playTTS(text: string): Promise<void> {
    if (!hasTTS()) {
      throw new Error("Not implemented")
    }

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
}

Platform satisfies Module;
