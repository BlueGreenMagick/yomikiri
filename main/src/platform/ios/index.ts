import Config, { type StoredConfiguration } from "lib/config";
import { LazyAsync, handleResponseMessage } from "lib/utils";
import {
  BrowserApi,
  currentTab,
  extensionManifest,
  handleMessage,
  message,
  updateTab,
} from "extension/browserApi";
import type {
  IPlatform,
  TTSVoice,
  TranslateResult,
  VersionInfo,
  IPlatformStatic,
  TTSRequest,
} from "../common";
import type {
  RawTokenizeResult,
  SearchRequest,
  TokenizeRequest,
} from "../common/backend";
import { getTranslation } from "../common/translate";
import { Backend as IosBackend } from "./backend";
import { AnkiApi as IosAnkiApi } from "./anki";
import {
  migrateConfigObject,
  type StoredCompatConfiguration,
} from "lib/compat";
import { EXTENSION_CONTEXT, PLATFORM } from "consts";

export * from "../common";

/** Type map for messages sent with `requestToApp()`*/
export interface AppMessageMap {
  tokenize: [TokenizeRequest, RawTokenizeResult];
  loadConfig: [null, StoredConfiguration];
  saveConfig: [StoredConfiguration, null];
  search: [SearchRequest, RawTokenizeResult];
  ttsVoices: [null, TTSVoice[]];
  tts: [TTSRequest, null];
  iosVersion: [null, IosVersion];
}

export type AppRequest<K extends keyof AppMessageMap> = AppMessageMap[K][0];
export type AppResponse<K extends keyof AppMessageMap> = AppMessageMap[K][1];

interface IosVersion {
  major: number;
  minor: number;
  patch: number;
}

export class IosPlatform implements IPlatform {
  static IS_DESKTOP = false;
  static IS_IOS = true;
  static IS_IOSAPP = false;

  browserApi: BrowserApi;
  // config migration is done only once even if requested multiple times
  configMigration = new LazyAsync<StoredConfiguration>(async () => {
    return await this.migrateConfigInner();
  });

  constructor(browserApi: BrowserApi) {
    this.browserApi = browserApi;
    if (EXTENSION_CONTEXT === "background") {
      handleMessage("loadConfig", async () => {
        const config = await this.updateConfig();
        return config;
      });
      handleMessage("saveConfig", (config) => {
        return this.saveConfig(config);
      });

      void this.setupIosPeriodicReload();
    }
  }

  newBackend(): IosBackend {
    return new IosBackend(this, this.browserApi);
  }

  newAnkiApi(config: Config): IosAnkiApi {
    return new IosAnkiApi(this, config);
  }

  /** Only works in background & page */
  async requestToApp<K extends keyof AppMessageMap>(
    key: K,
    request: AppRequest<K>,
  ): Promise<AppResponse<K>> {
    // eslint-disable-next-line
    const resp = await browser.runtime.sendNativeMessage("_", {
      key,
      request: JSON.stringify(request),
    });
    // eslint-disable-next-line
    const jsonResponse = handleResponseMessage<string>(resp);
    return JSON.parse(jsonResponse) as AppResponse<K>;
  }

  async getConfig(): Promise<StoredCompatConfiguration> {
    if (EXTENSION_CONTEXT === "contentScript") {
      return message("loadConfig", null);
    } else {
      return this.updateConfig();
    }
  }

  /**
   * Listens to web config changes,
   * which may occur when a new script loads and app config is fetched
   */
  subscribeConfig(subscriber: (config: StoredConfiguration) => void): void {
    this.browserApi.handleStorageChange("config", (change) => {
      subscriber(change.newValue as StoredConfiguration);
    });
  }

  // App config is the source of truth
  private async updateConfig(): Promise<StoredConfiguration> {
    const webConfigP = this.browserApi.getStorage<StoredCompatConfiguration>(
      "config",
      {},
    );
    const appConfigP = this.requestToApp("loadConfig", null);
    const [webConfig, appConfig] = await Promise.all([webConfigP, appConfigP]);
    if (webConfig != appConfig) {
      await this.browserApi.setStorage("config", appConfig);
    }
    return appConfig;
  }

  async saveConfig(config: StoredConfiguration): Promise<void> {
    if (EXTENSION_CONTEXT === "contentScript") {
      await message("saveConfig", config);
    } else {
      await this.requestToApp("saveConfig", config);
      await this.browserApi.setStorage("config", config);
    }
  }

  async openOptionsPage() {
    const OPTIONS_URL = "yomikiri://options";
    if (EXTENSION_CONTEXT !== "popup") {
      location.href = OPTIONS_URL;
    } else {
      const tab = await currentTab();
      if (tab.id === undefined) {
        throw new Error("Current tab does not have an id");
      }
      await updateTab(tab.id, { url: OPTIONS_URL });
      window.close();
    }
  }

  versionInfo(): VersionInfo {
    const manifest = extensionManifest();
    return {
      version: manifest.version,
    };
  }

  async japaneseTTSVoices(): Promise<TTSVoice[]> {
    return await this.requestToApp("ttsVoices", null);
  }

  async playTTS(text: string, voice: TTSVoice | null): Promise<void> {
    if (EXTENSION_CONTEXT !== "contentScript") {
      await this.requestToApp("tts", { voice, text });
    } else {
      await message("tts", { voice, text });
    }
  }

  async translate(text: string): Promise<TranslateResult> {
    if (EXTENSION_CONTEXT !== "contentScript") {
      return getTranslation(text);
    } else {
      return message("translate", text);
    }
  }

  openExternalLink(url: string): void {
    window.open(url, "_blank")?.focus();
  }

  async migrateConfig(): Promise<StoredConfiguration> {
    if (EXTENSION_CONTEXT === "contentScript") {
      return await message("migrateConfig", null);
    } else {
      return await this.configMigration.get();
    }
  }

  private async migrateConfigInner(): Promise<StoredConfiguration> {
    const configObject = await this.getConfig();
    const migrated = migrateConfigObject(configObject);
    await this.saveConfig(migrated);
    return migrated;
  }

  // workaround to ios 17.5 bug where background script freezes after ~30s of non-stop activity
  // https://github.com/alexkates/content-script-non-responsive-bug/issues/1
  private async setupIosPeriodicReload() {
    if (PLATFORM !== "ios" || EXTENSION_CONTEXT !== "background") return;
    console.debug("Set up periodic ios reload");

    let wakeup = Date.now();
    let last = Date.now();

    function checkReload() {
      const curr = Date.now();
      if (curr - last > 4000) {
        wakeup = curr;
      }
      last = curr;

      if (curr - wakeup > 25 * 1000) {
        console.debug("Reloading extension");
        chrome.runtime.reload();
      }
    }

    const iv = setInterval(checkReload, 1000);

    const ver = await this.requestToApp("iosVersion", null);
    if (!(ver.major === 17 && ver.minor === 5)) {
      clearInterval(iv);
    }
  }
}

IosPlatform satisfies IPlatformStatic;
export const Platform = IosPlatform;
export type Platform = IosPlatform;
