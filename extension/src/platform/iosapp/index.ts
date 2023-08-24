import type Utils from "~/utils";
import type { Module } from "../types";
import type { StoredConfiguration } from "~/config";

export namespace Platform {
  export const IS_DESKTOP = false;
  export const IS_IOS = false;
  export const IS_IOSAPP = true;

  interface MessageWebviewMap {
    ankiIsInstalled: [null, boolean];
    // returns false if anki is not installed
    ankiInfo: [null, boolean];
    // config in JSON string
    loadConfig: [null, string];
    saveConfig: [string, void];
  }

  export type WebviewRequest<K extends keyof MessageWebviewMap> = Utils.First<
    MessageWebviewMap[K]
  >;
  export type WebviewResponse<K extends keyof MessageWebviewMap> = Utils.Second<
    MessageWebviewMap[K]
  >;

  /** Message to app inside app's WKWebview */
  export async function messageWebview<K extends keyof MessageWebviewMap>(
    key: K,
    request: WebviewRequest<K>
  ): Promise<WebviewResponse<K>> {
    const message = {
      key,
      request,
    };
    // @ts-ignore
    return (await window.webkit.messageHandlers.yomikiri.postMessage(
      message
    )) as WebviewResponse<K>;
  }

  export async function loadConfig(): Promise<StoredConfiguration> {
    const configJson = await messageWebview("loadConfig", null);
    return JSON.parse(configJson);
  }

  export async function saveConfig(config: StoredConfiguration) {
    const configJson = JSON.stringify(config);
    await messageWebview("saveConfig", configJson);
  }

  export async function openOptionsPage(): Promise<void> {
    throw new Error("Not implemented for iosapp");
  }

  export function initialize() {}
}

Platform satisfies Module;
