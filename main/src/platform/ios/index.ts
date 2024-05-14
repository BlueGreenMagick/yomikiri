import Config, { type StoredConfiguration } from "~/lib/config";
import { handleMessageResponse } from "~/lib/utils";
import { BrowserApi } from "~/extension/browserApi";
import type { IPlatform, TTSVoice, TranslateResult, VersionInfo, IPlatformStatic, TTSRequest } from "../common";
import type { RawTokenizeResult, TokenizeRequest } from "../common/backend";
import { getTranslation } from "../common/translate";
import { Backend as IosBackend } from "./backend";
import { AnkiApi as IosAnkiApi } from "./anki";

export * from "../common";

/** Type map for messages sent with `requestToApp()`*/
export interface AppMessageMap {
  tokenize: [TokenizeRequest, RawTokenizeResult];
  loadConfig: [null, StoredConfiguration];
  saveConfig: [StoredConfiguration, null];
  search: [string, string[]];
  ttsVoices: [null, TTSVoice[]];
  tts: [TTSRequest, null];
}

export type AppRequest<K extends keyof AppMessageMap> = AppMessageMap[K][0];
export type AppResponse<K extends keyof AppMessageMap> = AppMessageMap[K][1];


export class IosPlatform implements IPlatform {
  static IS_DESKTOP = false;
  static IS_IOS = true;
  static IS_IOSAPP = false;

  browserApi: BrowserApi

  constructor(browserApi: BrowserApi) {
    this.browserApi = browserApi
    if (browserApi.context === "background") {
      browserApi.handleRequest("loadConfig", async () => {
        const config = await this.updateConfig();
        return config;
      });
      browserApi.handleRequest("saveConfig", (config) => {
        return this.saveConfig(config);
      });
    }
  }

  newBackend(): IosBackend {
    return new IosBackend(this, this.browserApi)
  }

  newAnkiApi(config: Config): IosAnkiApi {
    return new IosAnkiApi(this, config)
  }

  /** Only works in background & page */
  async requestToApp<K extends keyof AppMessageMap>(
    key: K,
    request: AppRequest<K>
  ): Promise<AppResponse<K>> {
    // eslint-disable-next-line
    const resp = await browser.runtime.sendNativeMessage("_", {
      key,
      request: JSON.stringify(request),
    });
    // eslint-disable-next-line
    const jsonResponse = handleMessageResponse<string>(resp);
    return JSON.parse(jsonResponse) as AppResponse<K>;
  }

  async getConfig(): Promise<StoredConfiguration> {
    if (this.browserApi.context === "contentScript") {
      return this.browserApi.request("loadConfig", null);
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
      subscriber(change.newValue as StoredConfiguration)
    })
  }

  // App config is the source of truth
  private async updateConfig(): Promise<StoredConfiguration> {
    const webConfigP = this.browserApi.getStorage<StoredConfiguration>("config", {});
    const appConfigP = this.requestToApp("loadConfig", null);
    const [webConfig, appConfig] = await Promise.all([webConfigP, appConfigP]);
    if (webConfig != appConfig) {
      await this.browserApi.setStorage("config", appConfig);
    }
    return appConfig;
  }

  async saveConfig(config: StoredConfiguration): Promise<void> {
    if (this.browserApi.context === "contentScript") {
      await this.browserApi.request("saveConfig", config);
    } else {
      await this.requestToApp("saveConfig", config);
      await this.browserApi.setStorage("config", config);
    }
  }

  async openOptionsPage() {
    const OPTIONS_URL = "yomikiri://options";
    if (this.browserApi.context !== "popup") {
      location.href = OPTIONS_URL;
    } else {
      const currentTab = await this.browserApi.currentTab();
      if (currentTab.id === undefined) {
        throw new Error("Current tab does not have an id");
      }
      await this.browserApi.updateTab(currentTab.id, { url: OPTIONS_URL });
      window.close();
    }
  }

  versionInfo(): VersionInfo {
    const manifest = this.browserApi.manifest();
    return {
      version: manifest.version
    }
  }

  async japaneseTTSVoices(): Promise<TTSVoice[]> {
    return await this.requestToApp("ttsVoices", null)
  }

  async playTTS(text: string, voice: TTSVoice | null): Promise<void> {
    if (this.browserApi.context !== "contentScript") {
      await this.requestToApp("tts", { voice, text })
    } else {
      await this.browserApi.request("tts", { voice, text })
    }
  }

  async translate(text: string): Promise<TranslateResult> {
    if (this.browserApi.context !== "contentScript") {
      return getTranslation(text)
    } else {
      return this.browserApi.request("translate", text);
    }
  }

  openExternalLink(url: string): void {
    window
      .open(url, "_blank")
      ?.focus();
  }
}

IosPlatform satisfies IPlatformStatic
export const Platform = IosPlatform
export type Platform = IosPlatform