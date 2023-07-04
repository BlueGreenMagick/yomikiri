import type { StoredConfiguration } from "~/config";
import type Utils from "~/utils";
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
    saveConfig: [StoredConfiguration, void];
  }

  export type AppRequest<K extends keyof AppMessageMap> = Utils.First<
    AppMessageMap[K]
  >;
  export type AppResponse<K extends keyof AppMessageMap> = Utils.Second<
    AppMessageMap[K]
  >;

  /** Only supported in iOS */
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

  export function loadConfig(): Promise<StoredConfiguration> {
    return Platform.requestToApp("loadConfig", null);
  }

  export function saveConfig(config: StoredConfiguration): Promise<void> {
    return Platform.requestToApp("saveConfig", config);
  }
}

Platform satisfies Module;
