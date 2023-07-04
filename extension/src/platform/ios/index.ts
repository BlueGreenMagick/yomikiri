import type { StoredConfiguration } from "~/config";
import Utils from "~/utils";
import { Api } from "~/api";
import type { Module } from "../types";
import type { Token } from "./tokenizer";

export namespace Platform {
  export const IS_DESKTOP = false;
  export const IS_IOS = true;
  export const IS_IOSAPP = false;

  /** Type map for messages sent with `requestToApp()`*/
  export interface AppMessageMap {
    tokenize: [string, Token[]];
    loadConfig: [null, StoredConfiguration];
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
}
if (Api.context === "background") {
  Api.handleRequest("loadConfig", () => {
    return Platform.loadConfig();
  });
}

Platform satisfies Module;
