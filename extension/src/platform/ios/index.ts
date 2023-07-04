import type { Module } from "../types";
import type { StoredConfiguration } from "~/config";
import { Api } from "~/api";

export namespace Platform {
  export const IS_DESKTOP = false;
  export const IS_IOS = true;
  export const IS_IOSAPP = false;

  export function loadConfig(): Promise<StoredConfiguration> {
    return Api.requestToApp("loadConfig", null);
  }

  export function saveConfig(config: StoredConfiguration): Promise<void> {
    return Api.requestToApp("saveConfig", config);
  }
}

Platform satisfies Module;
