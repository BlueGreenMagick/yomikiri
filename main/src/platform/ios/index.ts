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

  let browserApi: BrowserApi

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


  export function initialize(browserApiParam: BrowserApi) {
    browserApi = browserApiParam
    if (browserApi.context === "background") {
      browserApi.handleRequest("loadConfig", async () => {
        const config = await updateConfig();
        return config;
      });
      browserApi.handleRequest("saveConfig", (config) => {
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
    const response = browserApi.handleRequestResponse<string>(resp);
    return JSON.parse(response) as AppResponse<K>;
  }

  export async function getConfig(): Promise<StoredConfiguration> {
    if (browserApi.context === "contentScript") {
      return browserApi.request("loadConfig", null);
    } else {
      return updateConfig();
    }
  }

  /** 
   * Listens to web config changes, 
   * which may occur when a new script loads and app config is fetched
   */
  export function subscribeConfig(subscriber: (config: StoredConfiguration) => void): void {
    browserApi.handleStorageChange("config", (change) => {
      subscriber(change.newValue)
    })
  }

  // App config is the source of truth
  async function updateConfig(): Promise<StoredConfiguration> {
    const webConfigP = browserApi.getStorage<StoredConfiguration>("config", {});
    const appConfigP = Platform.requestToApp("loadConfig", null);
    const [webConfig, appConfig] = await Promise.all([webConfigP, appConfigP]);
    if (webConfig != appConfig) {
      await browserApi.setStorage("config", appConfig);
    }
    return appConfig;
  }

  export async function saveConfig(config: StoredConfiguration): Promise<void> {
    if (browserApi.context === "contentScript") {
      await browserApi.request("saveConfig", config);
    } else {
      const configJson = JSON.stringify(config);
      browserApi.setStorage("config", config);
      await Platform.requestToApp("saveConfig", configJson);
    }
  }

  export async function openOptionsPage() {
    const OPTIONS_URL = "yomikiri://options";
    if (browserApi.context !== "popup") {
      location.href = OPTIONS_URL;
    } else {
      const currentTab = await browserApi.currentTab();
      if (currentTab.id === undefined) {
        throw new Error("Current tab does not have an id");
      }
      await browserApi.updateTab(currentTab.id, { url: OPTIONS_URL });
      window.close();
    }
  }

  export async function versionInfo(): Promise<VersionInfo> {
    const manifest = browserApi.manifest();
    return {
      version: manifest.version
    }
  }

  export async function japaneseTTSVoices(): Promise<TTSVoice[]> {
    return await Platform.requestToApp("ttsVoices", null)
  }

  export async function playTTS(text: string): Promise<void> {
    if (browserApi.context !== "contentScript") {
      await Platform.requestToApp("tts", { voice: Config.get("tts.voice"), text })
    } else {
      await browserApi.request("tts", text)
    }

  }

  export async function translate(text: string): Promise<TranslateResult> {
    if (browserApi.context !== "contentScript") {
      return getTranslation(text)
    } else {
      return browserApi.request("translate", text);
    }
  }

  export function openExternalLink(url: string): void {
    window
      .open(url, "_blank")
      ?.focus();
  }
}

Platform satisfies Module;
