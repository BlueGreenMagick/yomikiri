import Config, { type StoredConfiguration } from "~/config";
import Utils from "~/utils";
import { BrowserApi } from "~/extension/browserApi";
import type { IosTTSRequest, Module, TTSVoice, TranslateResult, VersionInfo } from "../common";
import type { RawTokenizeResult, TokenizeRequest } from "../common/backend";
import { getTranslation } from "../desktop";

export * from "../common";

export namespace Platform {
  export const IS_DESKTOP = false;
  export const IS_IOS = true;
  export const IS_IOSAPP = false;

  /** Type map for messages sent with `requestToApp()`*/
  export interface AppMessageMap {
    tokenize: [TokenizeRequest, RawTokenizeResult];
    loadConfig: [null, StoredConfiguration];
    saveConfig: [string, null];
    search: [string, string[]];
    ttsVoices: [null, TTSVoice[]];
    tts: [IosTTSRequest, null];
  }

  export type AppRequest<K extends keyof AppMessageMap> = Utils.First<
    AppMessageMap[K]
  >;
  export type AppResponse<K extends keyof AppMessageMap> = Utils.Second<
    AppMessageMap[K]
  >;


  export function initialize() {
    if (BrowserApi.context === "background") {
      BrowserApi.handleRequest("loadConfig", async () => {
        const config = await updateConfig();
        return config;
      });
      BrowserApi.handleRequest("saveConfig", (config) => {
        return Platform.saveConfig(config);
      });
    }
  }

  /** Only works in background & page */
  export async function requestToApp<K extends keyof AppMessageMap>(
    key: K,
    request: AppRequest<K>
  ): Promise<AppResponse<K>> {
    const resp = await browser.runtime.sendNativeMessage("_", {
      key,
      request: JSON.stringify(request),
    });
    const response = BrowserApi.handleRequestResponse<string>(resp);
    return JSON.parse(response) as AppResponse<K>;
  }

  export async function getConfig(): Promise<StoredConfiguration> {
    if (BrowserApi.context === "contentScript") {
      return BrowserApi.request("loadConfig", null);
    } else {
      return updateConfig();
    }
  }

  /** 
   * Listens to web config changes, 
   * which may occur when a new script loads and app config is fetched
   */
  export function subscribeConfig(subscriber: (config: StoredConfiguration) => void): void {
    BrowserApi.handleStorageChange("config", (change) => {
      subscriber(change.newValue)
    })
  }

  // App config is the source of truth
  async function updateConfig(): Promise<StoredConfiguration> {
    const webConfigP = BrowserApi.getStorage<StoredConfiguration>("config", {});
    const appConfigP = Platform.requestToApp("loadConfig", null);
    const [webConfig, appConfig] = await Promise.all([webConfigP, appConfigP]);
    if (webConfig != appConfig) {
      await BrowserApi.setStorage("config", appConfig);
    }
    return appConfig;
  }

  export async function saveConfig(config: StoredConfiguration): Promise<void> {
    if (BrowserApi.context === "contentScript") {
      await BrowserApi.request("saveConfig", config);
    } else {
      const configJson = JSON.stringify(config);
      BrowserApi.setStorage("config", config);
      await Platform.requestToApp("saveConfig", configJson);
    }
  }

  export async function openOptionsPage() {
    const OPTIONS_URL = "yomikiri://options";
    if (BrowserApi.context !== "popup") {
      location.href = OPTIONS_URL;
    } else {
      const currentTab = await BrowserApi.currentTab();
      if (currentTab.id === undefined) {
        throw new Error("Current tab does not have an id");
      }
      await BrowserApi.updateTab(currentTab.id, { url: OPTIONS_URL });
      window.close();
    }
  }

  export async function versionInfo(): Promise<VersionInfo> {
    const manifest = BrowserApi.manifest();
    return {
      version: manifest.version
    }
  }

  export async function japaneseTTSVoices(): Promise<TTSVoice[]> {
    return await Platform.requestToApp("ttsVoices", null)
  }

  export async function playTTS(text: string): Promise<void> {
    if (BrowserApi.context !== "contentScript") {
      await Platform.requestToApp("tts", { voice: Config.get("tts.voice"), text })
    } else {
      await BrowserApi.request("tts", text)
    }

  }

  export async function translate(text: string): Promise<TranslateResult> {
    if (BrowserApi.context !== "contentScript") {
      return getTranslation(text)
    } else {
      return BrowserApi.request("translate", text);
    }
  }

  export function openExternalLink(url: string): void {
    window
      .open(url, "_blank")
      ?.focus();
  }
}

Platform satisfies Module;
