import { migrateConfigObject, type StoredCompatConfiguration } from "@/features/compat";
import { type StoredConfiguration } from "@/features/config";
import { YomikiriError } from "@/features/error";
import Utils, { LazyAsync } from "@/features/utils";
import type { RunMessageMap } from "@/platform/shared/backend";
import { getTranslation } from "../shared/translate";
import type { IPlatform, TranslateResult, TTSRequest, TTSVoice, VersionInfo } from "../types";
import type { RawAnkiInfo } from "./anki";
import { sendMessage } from "./messaging";

declare global {
  interface Window {
    iosConfigUpdated: () => Promise<void>;
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

export type WebviewRequest<K extends keyof MessageWebviewMap> = MessageWebviewMap[K][0];
export type WebviewResponse<K extends keyof MessageWebviewMap> = MessageWebviewMap[K][1];

export class IosAppPlatform implements IPlatform {
  readonly type = "iosapp";

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

  async getConfig(): Promise<StoredCompatConfiguration> {
    const config = await sendMessage("loadConfig", null);
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
    await sendMessage("saveConfig", config);

    // trigger update for this execution context
    for (const subscriber of this._configSubscribers) {
      subscriber(config);
    }
  }

  openOptionsPage(): void {
    throw new YomikiriError("Not implemented for iosapp");
  }

  async versionInfo(): Promise<VersionInfo> {
    return await sendMessage("versionInfo", null);
  }

  async japaneseTTSVoices(): Promise<TTSVoice[]> {
    return await sendMessage("ttsVoices", null);
  }

  async playTTS({ text, voice }: TTSRequest): Promise<void> {
    const req: TTSRequest = { text, voice };
    await sendMessage("tts", req);
  }

  async translate(text: string): Promise<TranslateResult> {
    return getTranslation(text);
  }

  /** Currently only works in options page */
  openExternalLink(url: string): void {
    sendMessage("openLink", url).catch((err: unknown) => {
      console.error(err);
    });
  }

  async migrateConfig(): Promise<StoredConfiguration> {
    return await this.configMigration.get();
  }

  private async migrateConfigInner(): Promise<StoredConfiguration> {
    const configObject = await this.getConfig();
    const migrated = migrateConfigObject(configObject);
    const continueMigration = await sendMessage("migrateConfig", null);
    if (continueMigration) {
      await this.saveConfig(migrated);
    }
    return migrated;
  }

  closeWindow(): Promise<void> {
    return sendMessage("close", null);
  }
}
