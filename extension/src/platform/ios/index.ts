import type { StoredConfiguration } from "~/config";
import Utils from "~/utils";
import { BrowserApi } from "~/browserApi";
import type { Module } from "../types";
import type { RawTokenizeResult } from "../types/backend";
import type { TokenizeRequest } from "~/backend";

export namespace Platform {
  export const IS_DESKTOP = false;
  export const IS_IOS = true;
  export const IS_IOSAPP = false;

  /** Type map for messages sent with `requestToApp()`*/
  export interface AppMessageMap {
    tokenize: [TokenizeRequest, RawTokenizeResult];
    loadConfig: [null, StoredConfiguration];
    search: [string, string[]];
  }

  export type AppRequest<K extends keyof AppMessageMap> = Utils.First<
    AppMessageMap[K]
  >;
  export type AppResponse<K extends keyof AppMessageMap> = Utils.Second<
    AppMessageMap[K]
  >;

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

  export async function loadConfig(): Promise<StoredConfiguration> {
    if (BrowserApi.context === "contentScript") {
      return BrowserApi.request("loadConfig", null);
    } else {
      return Platform.requestToApp("loadConfig", null);
    }
  }

  export function saveConfig(config: StoredConfiguration): Promise<void> {
    throw new Error("saveConfig should not be called in ios");
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

  export function initialize() {
    if (BrowserApi.context === "background") {
      BrowserApi.handleRequest("loadConfig", () => {
        return Platform.loadConfig();
      });
    }
  }
}

Platform satisfies Module;
