import Utils from "~/utils";
import type { IosTTSRequest, IPlatform, TTSVoice, TranslateResult, VersionInfo, IPlatformStatic } from "../common";
import { Config, type StoredConfiguration } from "~/config";
import type { RawTokenizeResult, TokenizeRequest } from "../common/backend";
import { getTranslation } from "../common/translate";
import type { RawDictionaryMetadata } from "./dictionary";
import {Backend as IosAppBackend} from "./backend"
import {Dictionary as IosAppDictionary} from "./dictionary"
import {AnkiApi as IosAppAnkiApi} from "./anki"

export * from "../common"

declare global {
  interface Window {
    iosConfigUpdated: () => Promise<void>;
  }
}

export interface MessageWebviewMap {
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

class IosAppPlatform implements IPlatform {
  static IS_DESKTOP = false;
  static IS_IOS = false;
  static IS_IOSAPP = true;

  _configSubscribers: ((config: StoredConfiguration) => void)[] = []

  constructor() {
    window.iosConfigUpdated = async () => {
      const config = await this.getConfig()
      for (const subscriber of this._configSubscribers) {
        subscriber(config)
      }
    }
  }

  newBackend(): IosAppBackend {
    return new IosAppBackend(this)
  }

  newDictionary(): IosAppDictionary {
    return new IosAppDictionary(this)
  }

  newAnkiApi(_config: Config): IosAppAnkiApi {
    return new IosAppAnkiApi(this)
  }

  /** Message to app inside app's WKWebview */
  async messageWebview<K extends keyof MessageWebviewMap>(
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

  async getConfig(): Promise<StoredConfiguration> {
    const config = await this.messageWebview("loadConfig", null);
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
  subscribeConfig(subscriber: (config: StoredConfiguration) => void): void {
    this._configSubscribers.push(subscriber)
  }

  async saveConfig(config: StoredConfiguration) {
    const configJson = JSON.stringify(config);
    await this.messageWebview("saveConfig", configJson);

    // trigger update for this execution context
    for (const subscriber of this._configSubscribers) {
      subscriber(config)
    }
  }

  async openOptionsPage(): Promise<void> {
    throw new Error("Not implemented for iosapp");
  }

  async versionInfo(): Promise<VersionInfo> {
    return await this.messageWebview("versionInfo", null);
  }

  async japaneseTTSVoices(): Promise<TTSVoice[]> {
    return await this.messageWebview("ttsVoices", null)
  }

  async playTTS(text: string): Promise<void> {
    const voice = Config.get("tts.voice");
    const req = { voice, text }
    await this.messageWebview("tts", JSON.stringify(req));
  }

  async translate(text: string): Promise<TranslateResult> {
    return getTranslation(text);
  }

  /** Currently only works in options page */
  openExternalLink(url: string): void {
    this.messageWebview("openLink", url)
  }

}

IosAppPlatform satisfies IPlatformStatic
export const Platform = IosAppPlatform
export type Platform = IosAppPlatform
