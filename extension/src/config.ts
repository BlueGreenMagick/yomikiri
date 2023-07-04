import type { NoteData } from "~/ankiNoteBuilder";
import { Platform } from "@platform";

/** Cannot distinguish between null and undefined */
export interface Configuration {
  "general.font_size": number;
  "general.font": string;
  "anki.connect_port": number;
  "anki.connect_url": string;
  "anki.templates": NoteData[];
  "x-callback.tabId": number | null;
  "x-callback.successTabId": number | null;
}

const defaultOptions: Configuration = {
  "general.font_size": 14,
  "general.font": "Meiryo",
  "anki.connect_port": 8785,
  "anki.connect_url": "http://127.0.0.1",
  "anki.templates": [],
  "x-callback.tabId": null,
  "x-callback.successTabId": null,
};

export interface StoredConfiguration extends Partial<Configuration> {
  [key: string]: any;
}

/** Get union of config keys that extends type T. */
export type ConfigKeysOfType<T> = {
  [K in keyof Configuration]: Configuration[K] extends T ? K : never;
}[keyof Configuration];

export namespace Config {
  let storage: StoredConfiguration;

  /** Api.initialize() before calling */
  export async function initialize(): Promise<void> {
    storage = await Platform.loadConfig();
  }

  export function get<K extends keyof Configuration>(key: K): Configuration[K] {
    const value = storage[key];
    return value !== undefined
      ? (value as Configuration[K])
      : defaultOptions[key];
  }

  /** If value is undefined, removes from storage*/
  export async function set<K extends keyof Configuration>(
    key: K,
    value: Configuration[K]
  ) {
    if (value === undefined) {
      delete storage[key];
    } else {
      storage[key] = value;
    }
    await Platform.saveConfig(storage);
  }

  export function defaultValue<K extends keyof Configuration>(
    key: K
  ): Configuration[K] {
    return defaultOptions[key];
  }
}

export default Config;
