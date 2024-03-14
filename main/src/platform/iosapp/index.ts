import type Utils from "~/utils";
import type { Module, TTSVoice, TranslateResult, VersionInfo } from "../common";
import type { StoredConfiguration } from "~/config";
import type { RawTokenizeResult, TokenizeRequest } from "../common/backend";
import { getTranslation } from "../desktop";
import type { RawDictionaryMetadata } from "./dictionary";

export * from "../common"

export namespace Platform {
  export const IS_DESKTOP = false;
  export const IS_IOS = false;
  export const IS_IOSAPP = true;

  interface MessageWebviewMap {
    ankiIsInstalled: [null, boolean];
    // returns false if anki is not installed
    ankiInfo: [null, boolean];
    loadConfig: [null, StoredConfiguration];
    saveConfig: [string, void];
    tokenize: [TokenizeRequest, RawTokenizeResult];
    searchTerm: [string, string[]];
    versionInfo: [null, VersionInfo]
    updateDict: [null, RawDictionaryMetadata]
    dictMetadata: [null, RawDictionaryMetadata]
    ttsVoices: [null, TTSVoice[]];

    // action extension
    close: [null, void];
  }

  export type WebviewRequest<K extends keyof MessageWebviewMap> = Utils.First<
    MessageWebviewMap[K]
  >;
  export type WebviewResponse<K extends keyof MessageWebviewMap> = Utils.Second<
    MessageWebviewMap[K]
  >;

  export function initialize() { }

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
    let json = (await window.webkit.messageHandlers.yomikiri.postMessage(
      message
    )) as string;
    return JSON.parse(json) as WebviewResponse<K>;
  }

  export async function getConfig(): Promise<StoredConfiguration> {
    return await messageWebview("loadConfig", null)
  }

  /** Does nothiing in iosapp */
  export function subscribeConfig(subscriber: (config: StoredConfiguration) => any): void {
    return
  }

  export async function saveConfig(config: StoredConfiguration) {
    const configJson = JSON.stringify(config);
    await messageWebview("saveConfig", configJson);
  }

  export async function openOptionsPage(): Promise<void> {
    throw new Error("Not implemented for iosapp");
  }

  export async function versionInfo(): Promise<VersionInfo> {
    return await messageWebview("versionInfo", null);
  }

  export async function japaneseTTSVoices(): Promise<TTSVoice[]> {
    return await Platform.messageWebview("ttsVoices", null)
  }

  export async function playTTS(text: string): Promise<void> {
    throw new Error("Not implemented!")
  }

  export async function translate(text: string): Promise<TranslateResult> {
    return getTranslation(text);
  }
}

Platform satisfies Module;
