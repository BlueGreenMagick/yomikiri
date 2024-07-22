import Utils, { LazyAsync } from "lib/utils";
import type {
  IPlatform,
  TTSVoice,
  TranslateResult,
  VersionInfo,
  TTSRequest,
  DictionaryMetadata,
} from "../common";
import { type StoredConfiguration } from "lib/config";
import type {
  RawTokenizeResult,
  SearchRequest,
  TokenizeRequest,
} from "../common/backend";
import { getTranslation } from "../common/translate";
import {
  IosAppDictionary,
  parseRawMetadata,
  type RawDictionaryMetadata,
} from "./dictionary";
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

const _configSubscribers: ((config: StoredConfiguration) => void)[] = [];

export namespace IosAppPlatform {
  export const IS_DESKTOP = false;
  export const IS_IOS = false;
  export const IS_IOSAPP = true;

  const configMigration = new LazyAsync<StoredConfiguration>(async () => {
    return await migrateConfigInner();
  });

  export function newDictionary(): IosAppDictionary {
    return new IosAppDictionary();
  }

  /** Message to app inside app's WKWebview */
  export async function messageWebview<K extends keyof MessageWebviewMap>(
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

  export async function getConfig(): Promise<StoredCompatConfiguration> {
    const config = await messageWebview("loadConfig", null);
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
  export function subscribeConfig(
    subscriber: (config: StoredConfiguration) => void,
  ): void {
    _configSubscribers.push(subscriber);
  }

  export async function saveConfig(config: StoredConfiguration) {
    await messageWebview("saveConfig", config);

    // trigger update for this execution context
    for (const subscriber of _configSubscribers) {
      subscriber(config);
    }
  }

  export function openOptionsPage(): void {
    throw new Error("Not implemented for iosapp");
  }

  export async function versionInfo(): Promise<VersionInfo> {
    return await messageWebview("versionInfo", null);
  }

  export async function japaneseTTSVoices(): Promise<TTSVoice[]> {
    return await messageWebview("ttsVoices", null);
  }

  export async function playTTS({ text, voice }: TTSRequest): Promise<void> {
    const req: TTSRequest = { text, voice };
    await messageWebview("tts", req);
  }

  export async function translate(text: string): Promise<TranslateResult> {
    return getTranslation(text);
  }

  /** Currently only works in options page */
  export function openExternalLink(url: string): void {
    messageWebview("openLink", url).catch((err: unknown) => {
      console.error(err);
    });
  }

  export async function migrateConfig(): Promise<StoredConfiguration> {
    return await configMigration.get();
  }

  async function migrateConfigInner(): Promise<StoredConfiguration> {
    const configObject = await getConfig();
    const migrated = migrateConfigObject(configObject);
    const continueMigration = await messageWebview("migrateConfig", null);
    if (continueMigration) {
      await saveConfig(migrated);
    }
    return migrated;
  }

  export async function getDictionaryMetadata(): Promise<DictionaryMetadata> {
    const raw = await messageWebview("dictMetadata", null);
    return parseRawMetadata(raw);
  }
}

window.iosConfigUpdated = async () => {
  const config = (await IosAppPlatform.getConfig()) as StoredConfiguration;
  for (const subscriber of _configSubscribers) {
    // TODO: migrate config for iosapp
    subscriber(config);
  }
};

IosAppPlatform satisfies IPlatform;
export const Platform = IosAppPlatform;
export const PagePlatform = Platform;
