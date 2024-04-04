import Utils from "~/utils";
import type { IosTTSRequest, Module, TTSVoice, TranslateResult, VersionInfo } from "../common";
import { Config, type StoredConfiguration } from "~/config";
import type { RawTokenizeResult, TokenizeRequest } from "../common/backend";
import { getTranslation } from "../desktop";
import type { RawDictionaryMetadata } from "./dictionary";

export * from "../common"

declare global {
  interface Window {
    iosConfigUpdated: () => void;
  }
}

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
    openLink: [string, null];
    // IosTTSRequest JSON
    tts: [string, null]

    // action extension
    close: [null, void];
  }

  export type WebviewRequest<K extends keyof MessageWebviewMap> = Utils.First<
    MessageWebviewMap[K]
  >;
  export type WebviewResponse<K extends keyof MessageWebviewMap> = Utils.Second<
    MessageWebviewMap[K]
  >;

  const _configSubscribers: ((config: StoredConfiguration) => any)[] = []

  export function initialize() {
    window.iosConfigUpdated = async () => {
      const config = await getConfig()
      for (const subscriber of _configSubscribers) {
        subscriber(config)
      }
    }
  }

  /** Message to app inside app's WKWebview */
  export async function messageWebview<K extends keyof MessageWebviewMap>(
    key: K,
    request: WebviewRequest<K>
  ): Promise<WebviewResponse<K>> {
    const message = {
      key,
      request,
    };

    // @ts-expect-error
    const resp = await window.webkit.messageHandlers.yomikiri.postMessage(
      message
    );
    if (resp === null) {
      return resp
    } else {
      return JSON.parse(resp) as WebviewResponse<K>;
    }
  }

  export async function getConfig(): Promise<StoredConfiguration> {
    const config = await messageWebview("loadConfig", null);
    if (typeof config !== "object") {
      Utils.log("ERROR: Invalid configuration stored in app. Resetting.")
      Utils.log(config)
      console.error("Invalid configuration stored in app. Resetting.")
      return {}
    } else {
      return config
    }
  }

  /** Does nothiing in iosapp */
  export function subscribeConfig(subscriber: (config: StoredConfiguration) => any): void {
    _configSubscribers.push(subscriber)
  }

  export async function saveConfig(config: StoredConfiguration) {
    const configJson = JSON.stringify(config);
    await messageWebview("saveConfig", configJson);

    // trigger update for this execution context
    for (const subscriber of _configSubscribers) {
      subscriber(config)
    }
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
    const voice = Config.get("tts.voice");
    const req = { voice, text }
    await Platform.messageWebview("tts", JSON.stringify(req));
  }

  export async function translate(text: string): Promise<TranslateResult> {
    return getTranslation(text);
  }

  /** Currently only works in options page */
  export function openExternalLink(url: string): void {
    Platform.messageWebview("openLink", url)
  }
}

Platform satisfies Module;
