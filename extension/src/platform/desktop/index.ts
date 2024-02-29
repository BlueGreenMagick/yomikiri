import { BrowserApi } from "~/browserApi";
import type { Module } from "../common";
import type { StoredConfiguration } from "~/config";

export namespace Platform {
  export const IS_DESKTOP = true;
  export const IS_IOS = false;
  export const IS_IOSAPP = false;

  export function loadConfig(): Promise<StoredConfiguration> {
    return BrowserApi.getStorage<StoredConfiguration>("config", {});
  }

  export function saveConfig(config: StoredConfiguration): Promise<void> {
    return BrowserApi.setStorage("config", config);
  }

  export function openOptionsPage() {
    chrome.runtime.openOptionsPage();
  }

  export function initialize() {}
}

Platform satisfies Module;
