import type { StoredConfiguration } from "~/config";
import Utils from "~/utils";
import { Api } from "~/api";
import type { Module } from "../types";
import type { Token } from "./backend";
import type { TokenizeRequest } from "~/background/backend";

interface IOSTokenizeResult {
  tokens: Token[];
  selectedTokenIdx: number;
  dicEntriesJson: string[];
}

export namespace Platform {
  export const IS_DESKTOP = false;
  export const IS_IOS = true;
  export const IS_IOSAPP = false;

  /** Type map for messages sent with `requestToApp()`*/
  export interface AppMessageMap {
    tokenize: [TokenizeRequest, IOSTokenizeResult];
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
    const response = Api.handleRequestResponse<string>(resp);
    return JSON.parse(response) as AppResponse<K>;
  }

  export async function loadConfig(): Promise<StoredConfiguration> {
    if (Api.context === "contentScript") {
      return Api.request("loadConfig", null);
    } else {
      return Platform.requestToApp("loadConfig", null);
    }
  }

  export function saveConfig(config: StoredConfiguration): Promise<void> {
    throw new Error("saveConfig should not be called in ios");
  }

  export async function openOptionsPage() {
    const OPTIONS_URL = "yomikiri://options";
    if (Api.context !== "popup") {
      location.href = OPTIONS_URL;
    } else {
      const currentTab = await Api.currentTab();
      if (currentTab.id === undefined) {
        throw new Error("Current tab does not have an id");
      }
      await Api.updateTab(currentTab.id, { url: OPTIONS_URL });
      window.close();
    }
  }
}

Platform satisfies Module;

if (Api.context === "background") {
  Api.handleRequest("loadConfig", () => {
    return Platform.loadConfig();
  });
}
