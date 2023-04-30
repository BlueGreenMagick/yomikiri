import Api from "~/api";
import type { Note } from "./api/anki";

export interface ConfigTypes {
  "anki.connect_port": number;
  "anki.connect_url": string;
  "anki.templates": Note[];
}

const defaultOptions: ConfigTypes = {
  "anki.connect_port": 8785,
  "anki.connect_url": "http://127.0.0.1",
  "anki.templates": [],
};

/** Get union of config keys that extends type T. */
export type ConfigKeysOfType<T> = {
  [K in keyof ConfigTypes]: ConfigTypes[K] extends T ? K : never;
}[keyof ConfigTypes];

export class Config {
  static async get<K extends keyof ConfigTypes>(key: K) {
    return await Api.getStorage<ConfigTypes[K]>(key, defaultOptions[key]);
  }

  static async set<K extends keyof ConfigTypes>(key: K, value: ConfigTypes[K]) {
    return await Api.setStorage(key, value);
  }

  static async default<K extends keyof ConfigTypes>(
    key: K
  ): Promise<ConfigTypes[K]> {
    return defaultOptions[key];
  }
}

export default Config;
