import type { Module } from "../types";
import type { StoredConfiguration } from "~/config";
import { Api } from "~/api";

export namespace Platform {
  export const IS_DESKTOP = false;
  export const IS_IOS = true;
  export const IS_IOSAPP = false;

  export async function loadConfig(): Promise<StoredConfiguration> {
    const configJson = await Api.requestToApp("loadConfig", null);
    return JSON.parse(configJson);
  }

  export async function saveConfig(config: StoredConfiguration) {
    const configJson = JSON.stringify(config);
    await Api.requestToApp("saveConfig", configJson);
  }
}

Platform satisfies Module;
