import { Api } from "~/api";
import type { Module } from "../types";
import type { StoredConfiguration } from "~/config";

export namespace Platform {
  export const IS_DESKTOP = true;
  export const IS_IOS = false;
  export const IS_IOSAPP = false;

  export function loadConfig(): Promise<StoredConfiguration> {
    return Api.getStorage<StoredConfiguration>("config", {});
  }

  export function saveConfig(config: StoredConfiguration): Promise<void> {
    return Api.setStorage("config", config);
  }
}

Platform satisfies Module;
