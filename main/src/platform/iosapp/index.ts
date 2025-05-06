import Utils, {
  handleResponseMessage,
  LazyAsync,
  type ResponseMessage,
} from "@/features/utils";
import type {
  IPlatform,
  TTSVoice,
  TranslateResult,
  VersionInfo,
  TTSRequest,
} from "../types";
import { type StoredConfiguration } from "@/features/config";
import { getTranslation } from "../shared/translate";
import {
  migrateConfigObject,
  type StoredCompatConfiguration,
} from "@/features/compat";
import { YomikiriError } from "@/features/error";
import type { RunMessageMap } from "@/platform/shared/backend";
import { _IosAppAnkiApi, IosAppAnkiApi, type RawAnkiInfo } from "./anki";
import { IosAppBackend } from "./backend";

export * from "../types";

declare global {
  interface Window {
    iosConfigUpdated: () => Promise<void>;
    webkit: {
      messageHandlers: {
        yomikiri: {
          postMessage: (message: {
            key: string;
            request: string;
          }) => Promise<ResponseMessage<string>>;
        };
      };
    };
  }
}

export interface MessageWebviewMap extends RunMessageMap {
  ankiIsInstalled: [null, boolean];
  // returns false if anki is not installed
  ankiInfo: [null, boolean];
  // Can only be requested in anki template options page.
  ankiInfoData: [null, RawAnkiInfo];
  loadConfig: [null, StoredConfiguration];
  saveConfig: [StoredConfiguration, void];
  /**
   * Returns true if migrated config is 'ok' to save.
   * If config was already migrated elsewhere, returns false.
   */
  migrateConfig: [null, boolean];
  versionInfo: [null, VersionInfo];
  updateDict: [null, boolean];
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

export class _IosAppPlatform implements IPlatform {
  readonly type = "iosapp";
  readonly anki = IosAppAnkiApi;
  readonly backend = IosAppBackend;

  private readonly _configSubscribers: ((
    config: StoredConfiguration,
  ) => void)[] = [];

  private readonly configMigration = new LazyAsync<StoredConfiguration>(
    async () => {
      return await this.migrateConfigInner();
    },
  );

  constructor() {
    window.iosConfigUpdated = async () => {
      const config = (await this.getConfig()) as StoredConfiguration;
      for (const subscriber of this._configSubscribers) {
        // TODO: migrate config for iosapp
        subscriber(config);
      }
    };
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
    const jsonResponse = handleResponseMessage(response);
    return JSON.parse(jsonResponse) as WebviewResponse<K>;
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
    throw new YomikiriError("Not implemented for iosapp");
  }

  async versionInfo(): Promise<VersionInfo> {
    return await this.messageWebview("versionInfo", null);
  }

  async japaneseTTSVoices(): Promise<TTSVoice[]> {
    return await this.messageWebview("ttsVoices", null);
  }

  async playTTS({ text, voice }: TTSRequest): Promise<void> {
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

  async migrateConfigInner(): Promise<StoredConfiguration> {
    const configObject = await this.getConfig();
    const migrated = migrateConfigObject(configObject);
    const continueMigration = await this.messageWebview("migrateConfig", null);
    if (continueMigration) {
      await this.saveConfig(migrated);
    }
    return migrated;
  }
}

export const IosAppPlatform = new _IosAppPlatform();
export const Platform = IosAppPlatform;
export const PagePlatform = Platform;

export type IosAppPlatform = typeof IosAppPlatform;
export type Platform = IosAppPlatform;
