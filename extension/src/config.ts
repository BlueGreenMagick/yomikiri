import { Api } from "~/api";
import type { NoteData } from "~/ankiNoteBuilder";

/** Cannot distinguish between null and undefined */
export interface ConfigTypes {
  "general.font_size": number;
  "general.font": string;
  "anki.connect_port": number;
  "anki.connect_url": string;
  "anki.templates": NoteData[];
  "x-callback.tabId": number | null;
  "x-callback.successTabId": number | null;
}

const defaultOptions: ConfigTypes = {
  "general.font_size": 16,
  "general.font": "Meiryo",
  "anki.connect_port": 8785,
  "anki.connect_url": "http://127.0.0.1",
  "anki.templates": [],
  "x-callback.tabId": null,
  "x-callback.successTabId": null,
};

/** Get union of config keys that extends type T. */
export type ConfigKeysOfType<T> = {
  [K in keyof ConfigTypes]: ConfigTypes[K] extends T ? K : never;
}[keyof ConfigTypes];

export class Config {
  static async get<K extends keyof ConfigTypes>(key: K) {
    return await Api.getStorage<ConfigTypes[K]>(key, defaultOptions[key]);
  }

  /** If value is null or undefined, removes from storage*/
  static async set<K extends keyof ConfigTypes>(key: K, value: ConfigTypes[K]) {
    if (value === null || value === undefined) {
      await Api.removeStorage(key);
    } else {
      await Api.setStorage(key, value);
    }
  }

  static async default<K extends keyof ConfigTypes>(
    key: K
  ): Promise<ConfigTypes[K]> {
    return defaultOptions[key];
  }
}

export default Config;
