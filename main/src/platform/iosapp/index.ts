import Utils, { LazyAsync } from "lib/utils";
import type {
  IPlatform,
  TTSVoice,
  TranslateResult,
  VersionInfo,
  IPlatformStatic,
  TTSRequest,
} from "../common";
import { Config, type StoredConfiguration } from "lib/config";
import type {
  RawTokenizeResult,
  SearchRequest,
  TokenizeRequest,
} from "../common/backend";
import { getTranslation } from "../common/translate";
import type { RawDictionaryMetadata } from "./dictionary";
import { Backend as IosAppBackend } from "./backend";
import { Dictionary as IosAppDictionary } from "./dictionary";
import { AnkiApi as IosAppAnkiApi } from "./anki";
import {
  migrateConfigObject,
  type StoredCompatConfiguration,
} from "lib/compat";

export * from "../common";

declare global {
  interface Window {
    iosConfigUpdated: () => Promise<void>;
    webkit: {
      messageHandlers: {
        yomikiri: {
          postMessage: (message: {
            key: string;
            request: string;
          }) => Promise<string | null>;
        };
      };
    };
  }
}

export interface MessageWebviewMap {
  ankiIsInstalled: [null, boolean];
  // returns false if anki is not installed
  ankiInfo: [null, boolean];
  loadConfig: [null, StoredConfiguration];
  saveConfig: [StoredConfiguration, void];
  /**
   * Returns true if migrated config is 'ok' to save.
   * If config was already migrated elsewhere, returns false.
   */
  migrateConfig: [null, boolean];
  tokenize: [TokenizeRequest, RawTokenizeResult];
  searchTerm: [SearchRequest, RawTokenizeResult];
  versionInfo: [null, VersionInfo];
  updateDict: [null, RawDictionaryMetadata];
  dictMetadata: [null, RawDictionaryMetadata];
  ttsVoices: [null, TTSVoice[]];
  openLink: [string, null];
  tts: [TTSRequest, null];

  // action extension
  close: [null, void];
}

export type WebviewRequest<K extends keyof MessageWebviewMap> =
  MessageWebviewMap[K][0];
export type WebviewResponse<K extends keyof MessageWebviewMap> =
  MessageWebviewMap[K][1];

export class IosAppPlatform implements IPlatform {
  static IS_DESKTOP = false;
  static IS_IOS = false;
  static IS_IOSAPP = true;

  _configSubscribers: ((config: StoredConfiguration) => void)[] = [];

  configMigration = new LazyAsync<StoredConfiguration>(async () => {
    return await this.migrateConfigInner();
  });

  constructor() {
    window.iosConfigUpdated = async () => {
      const config = (await this.getConfig()) as StoredConfiguration;
      for (const subscriber of this._configSubscribers) {
        // TODO: migrate config for iosapp
        subscriber(config);
      }
    };
  }

  newBackend(): IosAppBackend {
    return new IosAppBackend(this);
  }

  newDictionary(): IosAppDictionary {
    return new IosAppDictionary(this);
  }

  newAnkiApi(_config?: Config): IosAppAnkiApi {
    return new IosAppAnkiApi(this);
  }

  /** Message to app inside app's WKWebview */
  async messageWebview<K extends keyof MessageWebviewMap>(
    key: K,
    request: WebviewRequest<K>,
  ): Promise<WebviewResponse<K>> {
    const message = {
      key,
      request: JSON.stringify(request),
    };
    const response =
      await window.webkit.messageHandlers.yomikiri.postMessage(message);
    if (response === null) {
      return null;
    } else {
      return JSON.parse(response) as WebviewResponse<K>;
    }
  }

  async getConfig(): Promise<StoredCompatConfiguration> {
    const config = await this.messageWebview("loadConfig", null);
    if (typeof config !== "object") {
      Utils.log("ERROR: Invalid configuration stored in app. Resetting.");
      Utils.log(config);
      console.error("Invalid configuration stored in app. Resetting.");
      return {};
    } else {
      return config;
    }
  }

  /** Does nothiing in iosapp */
  subscribeConfig(subscriber: (config: StoredConfiguration) => void): void {
    this._configSubscribers.push(subscriber);
  }

  async saveConfig(config: StoredConfiguration) {
    await this.messageWebview("saveConfig", config);

    // trigger update for this execution context
    for (const subscriber of this._configSubscribers) {
      subscriber(config);
    }
  }

  openOptionsPage(): void {
    throw new Error("Not implemented for iosapp");
  }

  async versionInfo(): Promise<VersionInfo> {
    return await this.messageWebview("versionInfo", null);
  }

  async japaneseTTSVoices(): Promise<TTSVoice[]> {
    return await this.messageWebview("ttsVoices", null);
  }

  async playTTS(text: string, voice: TTSVoice | null): Promise<void> {
    const req: TTSRequest = { text, voice };
    await this.messageWebview("tts", req);
  }

  async translate(text: string): Promise<TranslateResult> {
    return getTranslation(text);
  }

  /** Currently only works in options page */
  openExternalLink(url: string): void {
    this.messageWebview("openLink", url).catch((err: unknown) => {
      console.error(err);
    });
  }

  async migrateConfig(): Promise<StoredConfiguration> {
    return await this.configMigration.get();
  }

  private async migrateConfigInner(): Promise<StoredConfiguration> {
    const configObject = await this.getConfig();
    const migrated = migrateConfigObject(configObject);
    const continueMigration = await this.messageWebview("migrateConfig", null);
    if (continueMigration) {
      await this.saveConfig(migrated);
    }
    return migrated;
  }
}

IosAppPlatform satisfies IPlatformStatic;
export const Platform = IosAppPlatform;
export type Platform = IosAppPlatform;
