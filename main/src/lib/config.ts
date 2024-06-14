import { Platform } from "@platform";
import { VERSION } from "consts";
import type { TTSVoice } from "../platform/common";
import { type StoredCompatConfiguration, type StoredConfig } from "./compat";
import { writable, type Writable } from "svelte/store";
import type { AnkiTemplate } from "./anki";
import { log } from "./utils";

/** Incremented each time Configuration interface is modified */
export const CONFIG_VERSION = 3;

/** Must not be undefined */
export interface Configuration {
  "state.enabled": boolean;
  /** Only for desktop */
  "state.anki.deferred_note_count": number;
  /** Only for desktop */
  "state.anki.deferred_note_error": boolean;
  "general.font_size": number;
  "general.font": string;
  "anki.connect_port": number;
  "anki.connect_url": string;
  "anki.anki_template": AnkiTemplate | null;
  "anki.enabled": boolean;
  /** Defer adding notes if Anki cannot be connected. */
  "anki.defer_notes": boolean;
  /** On ios, if auto redirect back to safari */
  "anki.ios_auto_redirect": boolean;
  /** set to null if voice is not available */
  "tts.voice": TTSVoice | null;
  /** Yomikiri semantic version on last config save */
  version: string;
  config_version: typeof CONFIG_VERSION;
}

export const defaultOptions: Configuration = {
  "state.enabled": true,
  "state.anki.deferred_note_count": 0,
  "state.anki.deferred_note_error": false,
  "general.font_size": 14,
  "general.font": "Meiryo",
  "anki.connect_port": 8765,
  "anki.connect_url": "http://127.0.0.1",
  "anki.anki_template": null,
  "anki.enabled": false,
  "anki.defer_notes": true,
  "anki.ios_auto_redirect": true,
  "tts.voice": null,
  version: VERSION,
  config_version: CONFIG_VERSION,
};

export type ConfigKey = keyof Configuration;

export type StoredConfiguration = StoredConfig<Configuration>;

/** Get union of config keys that extends type T. */
export type ConfigKeysOfType<T> = {
  [K in keyof Configuration]: Configuration[K] extends T ? K : never;
}[keyof Configuration];

const STYLE_ELEMENT_ID = "yomikiri-addon-css-styling";

export interface WritableConfig<T> extends Writable<T> {
  /** Deletes the saved config */
  delete: () => void;
}

export class Config {
  platform: Platform;
  private storage: StoredConfiguration;
  private stores: Map<ConfigKey, WritableConfig<Configuration[ConfigKey]>>;

  initialized = false;
  subscribers: (() => void)[] = [];
  documents: WeakRef<Document>[] = [];

  private constructor(platform: Platform, storage: StoredConfiguration) {
    this.platform = platform;
    this.storage = storage;
    this.stores = new Map();

    platform.subscribeConfig((cfg) => {
      this.storage = cfg;
      this.runSubscribers();
    });

    this.subscribe(() => {
      this.updateStyling();
    });

    this.initialized = true;
    this.runSubscribers();
  }

  static async initialize(platform: Platform): Promise<Config> {
    const stored = await platform.getConfig();
    const storage = await migrateIfNeeded(platform, stored);
    const config = new Config(platform, storage);
    await config.updateVersion();
    return config;
  }

  get<K extends keyof Configuration>(key: K): Configuration[K] {
    const value = this.storage[key];
    return value !== undefined ?
        (value as Configuration[K])
      : defaultOptions[key];
  }

  /**
   * To remove from storage, set value to `undefined`.
   *
   * If `save` is `false`, only updates config values in this context.
   */
  async set<K extends keyof Configuration>(
    key: K,
    value: Configuration[K] | undefined,
    save = true,
  ): Promise<void> {
    if (value === this.storage[key]) return;

    if (value === undefined) {
      /* eslint-disable-next-line */
      delete this.storage[key];
    } else {
      this.storage[key] = value;
    }

    this.runSubscribers();
    if (save) {
      await this.save();
    }
  }

  async save(): Promise<void> {
    await this.platform.saveConfig(this.storage);
  }

  defaultValue<K extends keyof Configuration>(key: K): Configuration[K] {
    return defaultOptions[key];
  }

  /**
   * If Config is initialized, subscriber will run immediately.
   *
   * If Config isn't initialized yet, it will run on initialization.
   */
  subscribe(subscriber: () => void): void {
    this.subscribers.push(subscriber);
    if (this.initialized) {
      subscriber();
    }
  }

  removeSubscriber(subscriber: () => void): boolean {
    const idx = this.subscribers.indexOf(subscriber);
    if (idx !== -1) {
      this.subscribers.splice(idx, 1);
      return true;
    }
    return false;
  }

  private runSubscribers(): void {
    for (const subscriber of this.subscribers) {
      try {
        subscriber();
      } catch (err) {
        console.error("Uncaught config subscriber error:", err);
      }
    }
  }

  /**
   * Insert or update <style> properties from config,
   * watch for config changes and auto-update <style>
   */
  setStyle(doc: Document) {
    let alreadyExisting = false;
    for (const docRef of this.documents) {
      const derefed = docRef.deref();
      if (derefed === undefined) continue;
      if (derefed === doc) {
        alreadyExisting = true;
        break;
      }
    }
    if (!alreadyExisting) {
      const ref = new WeakRef(doc);
      this.documents.push(ref);
    }
    this.updateStyling();
  }

  /** Update <style> for all registered _documents */
  private updateStyling() {
    const css = this.generateCss();
    for (const docref of this.documents) {
      const doc = docref.deref();
      if (doc === undefined) continue;
      let styleEl = doc.getElementById(STYLE_ELEMENT_ID);
      if (styleEl === null) {
        styleEl = doc.createElement("style");
        styleEl.id = STYLE_ELEMENT_ID;
        doc.head.appendChild(styleEl);
      }
      styleEl.textContent = css;
    }
  }

  generateCss(): string {
    const fontSize = this.get("general.font_size");
    const font = this.get("general.font");
    const escapedFont = font.replace('"', '\\"').replace("\\", "\\\\");

    return `:root {
--font-size: ${fontSize}px;
--japanese-font: "${escapedFont}";
    }`;
  }

  async updateVersion() {
    if (this.storage.version !== defaultOptions.version) {
      await this.set("version", defaultOptions.version);
    }
  }

  store<K extends ConfigKey>(key: K): WritableConfig<Configuration[K]> {
    const existing = this.stores.get(key) as WritableConfig<Configuration[K]>;
    if (existing !== undefined) {
      return existing;
    }

    const store = this.createStore(key);
    this.stores.set(key, store);
    return store;
  }

  private createStore<K extends keyof Configuration>(
    key: K,
  ): WritableConfig<Configuration[K]> {
    let stored = this.get(key);
    const { subscribe, set } = writable<Configuration[K]>(stored);

    const setValue = (val: Configuration[K]) => {
      stored = val;
      void this.set(key, stored);
      set(stored);
    };
    const changeHandler = () => {
      const val = this.get(key);
      setValue(val);
    };

    this.subscribe(changeHandler);

    return {
      subscribe: (run, invalidate) => {
        const unsubscribe = subscribe(run, invalidate);
        return () => {
          this.removeSubscriber(changeHandler);
          unsubscribe();
        };
      },
      set: setValue,
      update: (updater) => {
        setValue(updater(stored));
      },
      delete: () => {
        void this.set(key, undefined);
        stored = this.get(key);
        set(stored);
      },
    };
  }

  /**
   * If config['tts.voice'] is null, re-check if tts is available and update config
   *
   * tts is currently not used.
   */
  async setupTTSVoice(platform: Platform): Promise<void> {
    if (this.get("tts.voice") !== null) return;
    const voices = await platform.japaneseTTSVoices();
    if (voices.length === 0) return;
    // reverse order sort
    voices.sort((a, b) => b.quality - a.quality);
    log("initialized tts voice");
    await this.set("tts.voice", voices[0]);
  }
}

export async function migrateIfNeeded(
  platform: Platform,
  configObject: StoredCompatConfiguration,
): Promise<StoredConfiguration> {
  if (configObject.config_version === CONFIG_VERSION) {
    return configObject as StoredConfiguration;
  }

  return await platform.migrateConfig();
}

export default Config;
