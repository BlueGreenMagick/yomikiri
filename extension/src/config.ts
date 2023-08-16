import type { NoteData } from "~/ankiNoteBuilder";
import { Platform } from "@platform";
import Utils from "./utils";

/** Must not be undefined */
export interface Configuration {
  "general.font_size": number;
  "general.font": string;
  "anki.connect_port": number;
  "anki.connect_url": string;
  "anki.template": NoteData | null;
  "anki.enabled": boolean;
}

const defaultOptions: Configuration = {
  "general.font_size": 14,
  "general.font": "Meiryo",
  "anki.connect_port": 8785,
  "anki.connect_url": "http://127.0.0.1",
  "anki.template": null,
  "anki.enabled": false,
};

export interface StoredConfiguration extends Partial<Configuration> {
  [key: string]: any;
}

/** Get union of config keys that extends type T. */
export type ConfigKeysOfType<T> = {
  [K in keyof Configuration]: Configuration[K] extends T ? K : never;
}[keyof Configuration];

export namespace Config {
  let _storage: StoredConfiguration | undefined;

  export async function load(): Promise<StoredConfiguration> {
    if (_storage === undefined) {
      _storage = await Platform.loadConfig();
    }
    return _storage;
  }

  export async function loadGet<K extends keyof Configuration>(
    key: K
  ): Promise<Configuration[K]> {
    await load();
    return get(key);
  }

  export function get<K extends keyof Configuration>(key: K): Configuration[K] {
    if (_storage === undefined) {
      throw new Error("_storage is undefined");
    }
    const value = _storage[key];
    return value !== undefined
      ? (value as Configuration[K])
      : defaultOptions[key];
  }

  /** If value is undefined, removes from storage*/
  export async function loadSet<K extends keyof Configuration>(
    key: K,
    value: Configuration[K]
  ) {
    await load();
    return set(key, value);
  }

  /** If value is undefined, removes from storage*/
  export async function set<K extends keyof Configuration>(
    key: K,
    value: Configuration[K]
  ) {
    if (_storage === undefined) {
      throw new Error("_storage is undefined");
    }
    if (value === undefined) {
      delete _storage[key];
    } else {
      _storage[key] = value;
    }
    await Platform.saveConfig(_storage);
  }

  export function defaultValue<K extends keyof Configuration>(
    key: K
  ): Configuration[K] {
    return defaultOptions[key];
  }
}

export default Config;
