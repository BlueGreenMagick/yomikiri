import { Platform } from "@platform";
import { VERSION } from "consts";
import type { TTSVoice } from "../platform/common";
import { type StoredCompatConfiguration, type StoredConfig } from "./compat";
import { writable, type Writable } from "svelte/store";
import type { AnkiTemplate } from "./anki";
import { Disposable, LazyAsync, log } from "./utils";
import { YomikiriError } from "./error";

/**
 * Incremented each time Config has to be migrated.
 *
 * It does not have to be incremented for simple property addition.
 */
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
  "general.tooltip_max_height": number;
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
  "general.font": "",
  "general.tooltip_max_height": 300,
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

export interface WritableConfig<T> extends Writable<T> {
  /** Deletes the saved config */
  delete: () => void;
}

export class Config {
  private storage: StoredConfiguration;
  private stores: Map<ConfigKey, WritableConfig<Configuration[ConfigKey]>>;

  initialized = false;
  subscribers: (() => void)[] = [];
  documents: WeakRef<Document | DocumentFragment>[] = [];

  static instance: LazyAsync<Config> = new LazyAsync(() => Config.initialize());

  private constructor(storage: StoredConfiguration) {
    this.storage = storage;
    this.stores = new Map();

    Platform.subscribeConfig((cfg) => {
      this.storage = cfg;
      this.runSubscribers();
    });

    this.initialized = true;
    this.runSubscribers();
  }

  private static async initialize(): Promise<Config> {
    const stored = await Platform.getConfig();
    const storage = await migrateIfNeeded(stored);
    const config = new Config(storage);
    await config.updateVersion();
    return config;
  }

  /**
   * Assumes config is already initialized, and returns instance.
   *
   * Throws an error if config was not initialized.
   *
   * This method should only be used in svelte components,
   * where we *know* config was initialized in `Page.svelte`
   */
  static using(): Config {
    const config = Config.instance.getIfInitialized();
    if (config !== undefined) {
      return config;
    } else {
      throw new YomikiriError("Fatal: Config was not initialized");
    }
  }

  get<K extends keyof Configuration>(key: K): Configuration[K] {
    const value = this.storage[key];
    return value !== undefined ?
        (value as Configuration[K])
      : defaultOptions[key];
  }

  /**
   * To remove from storage, set value to `undefined`.
   */
  async set<K extends keyof Configuration>(
    key: K,
    value: Configuration[K] | undefined,
  ): Promise<void> {
    const changed = this.setInternal(key, value);
    if (!changed) return;
    this.runSubscribers();
    await this.save();
  }

  async setBatch(configs: Partial<Configuration>) {
    let changed = false;
    for (const key in configs) {
      const k = key as keyof Configuration;
      changed = changed || this.setInternal(k, configs[k]);
    }
    if (!changed) return;
    this.runSubscribers();
    await this.save();
  }

  /**
   * Set value internally.
   * This does not save config to storage, or trigger subscribers.
   * Returns `true` if value was changed.
   */
  setInternal<K extends keyof Configuration>(
    key: K,
    value: Configuration[K] | undefined,
  ): boolean {
    if (value === this.storage[key]) return false;

    if (value === undefined) {
      /* eslint-disable-next-line */
      delete this.storage[key];
    } else {
      this.storage[key] = value;
    }
    return true;
  }

  async save(): Promise<void> {
    await Platform.saveConfig(this.storage);
  }

  defaultValue<K extends keyof Configuration>(key: K): Configuration[K] {
    return defaultOptions[key];
  }

  /**
   * If Config is initialized, subscriber will run immediately.
   *
   * If Config isn't initialized yet, it will run on initialization.
   */
  subscribe(subscriber: () => void): Disposable {
    this.subscribers.push(subscriber);
    if (this.initialized) {
      subscriber();
    }
    return new Disposable(() => {
      const idx = this.subscribers.indexOf(subscriber);
      if (idx !== -1) {
        this.subscribers.splice(idx, 1);
      }
    });
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

    const changeSubscription = this.subscribe(changeHandler);

    return {
      subscribe: (run, invalidate) => {
        const unsubscribe = subscribe(run, invalidate);
        return () => {
          changeSubscription.dispose();
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

  /** Set CSS variables to `el` when config is changed */
  setUpdatedStyle(el: HTMLElement) {
    const ref = new WeakRef(el);

    const unsubscribeFontSize = this.store("general.font_size").subscribe(
      (size) => {
        const el = ref.deref();
        if (el === undefined) {
          unsubscribeFontSize();
          return;
        }
        el.style.setProperty("--font-size", `${size}px`);
      },
    );
    const unsubscribeFont = this.store("general.font").subscribe((font) => {
      const el = ref.deref();
      if (el === undefined) {
        unsubscribeFont();
        return;
      }
      const escapedFont = font.replace('"', '\\"').replace("\\", "\\\\");
      el.style.setProperty("--japanese-font", `"${escapedFont}"`);
    });
  }

  /**
   * If config['tts.voice'] is null, re-check if tts is available and update config
   *
   * tts is currently not used.
   */
  async setupTTSVoice(): Promise<void> {
    if (this.get("tts.voice") !== null) return;
    const voices = await Platform.japaneseTTSVoices();
    if (voices.length === 0) return;
    // reverse order sort
    voices.sort((a, b) => b.quality - a.quality);
    log("initialized tts voice");
    await this.set("tts.voice", voices[0]);
  }
}

export async function migrateIfNeeded(
  configObject: StoredCompatConfiguration,
): Promise<StoredConfiguration> {
  if (configObject.config_version === CONFIG_VERSION) {
    return configObject as StoredConfiguration;
  }

  return await Platform.migrateConfig();
}

export default Config;
