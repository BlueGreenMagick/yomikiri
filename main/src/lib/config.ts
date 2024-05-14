import type { NoteData } from "./anki";
import { Platform } from "@platform";
import { VERSION } from "../common";
import type { TTSVoice } from "../platform/common";
import { migrateIfNeeded } from "./compat";

export const CONFIG_VERSION = 2

/** Must not be undefined */
export interface Configuration {
  "state.enabled": boolean;
  "general.font_size": number;
  "general.font": string;
  "anki.connect_port": number;
  "anki.connect_url": string;
  "anki.template": NoteData | null;
  "anki.enabled": boolean;
  /** On ios, if auto redirect back to safari */
  "anki.ios_auto_redirect": boolean;
  /** set to null if voice is not available */
  "tts.voice": TTSVoice | null;
  /** Yomikiri semantic version on last config save */
  "version": string
  "config_version": typeof CONFIG_VERSION
}

export const defaultOptions: Configuration = {
  "state.enabled": true,
  "general.font_size": 14,
  "general.font": "Meiryo",
  "anki.connect_port": 8765,
  "anki.connect_url": "http://127.0.0.1",
  "anki.template": null,
  "anki.enabled": false,
  "anki.ios_auto_redirect": true,
  "tts.voice": null,
  "version": VERSION,
  "config_version": CONFIG_VERSION
};

export type StoredConfiguration = Partial<Configuration>

/** Get union of config keys that extends type T. */
export type ConfigKeysOfType<T> = {
  [K in keyof Configuration]: Configuration[K] extends T ? K : never;
}[keyof Configuration];


const STYLE_ELEMENT_ID = "yomikiri-addon-css-styling";

export class Config {
  initialized = false
  subscribers: (() => void)[] = []
  documents: WeakRef<Document>[] = []

  private storage: StoredConfiguration
  platform: Platform

  private constructor(platform: Platform, storage: StoredConfiguration) {
    this.platform = platform
    this.storage = storage

    platform.subscribeConfig((cfg) => {
      this.storage = cfg
      for (const subscriber of this.subscribers) {
        try {
          subscriber()
        } catch (err) {
          console.error("Uncaught config subscriber error:", err)
        }
      }
    });

    this.subscribe(() => {
      this.updateStyling()
    })
    this.initialized = true
  }

  static async initialize(platform: Platform): Promise<Config> {
    const stored = await platform.getConfig()
    const storage = await migrateIfNeeded(platform, stored)
    const config = new Config(platform, storage)
    await config.updateVersion()
    return config
  }


  get<K extends keyof Configuration>(key: K): Configuration[K] {
    const value = this.storage[key];
    return value !== undefined
      ? (value as Configuration[K])
      : defaultOptions[key];
  }

  /** 
   * To remove from storage, set value to `undefined`.
   * 
   * If `save` is `false`, only updates config values in this context.
   */
  async set<K extends keyof Configuration>(
    key: K,
    value: Configuration[K],
    save = true
  ): Promise<void> {
    if (value === undefined) {
      /* eslint-disable-next-line */
      delete this.storage[key];
    } else {
      this.storage[key] = value;
    }
    if (save) {
      await this.save()
    }
  }

  async save(): Promise<void> {
    await this.platform.saveConfig(this.storage);
  }

  defaultValue<K extends keyof Configuration>(
    key: K
  ): Configuration[K] {
    return defaultOptions[key];
  }

  /** 
   * If Config is initialized, subscriber will run immediately.
   * 
   * If Config isn't initialized yet, it will run on initialization.
   */
  subscribe(subscriber: () => void): void {
    this.subscribers.push(subscriber)
    if (this.initialized) {
      subscriber()
    }
  }

  removeSubscriber(subscriber: () => void): boolean {
    const idx = this.subscribers.indexOf(subscriber);
    if (idx !== -1) {
      this.subscribers.splice(idx, 1);
      return true
    }
    return false
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
        alreadyExisting = true
        break;
      }
    }
    if (!alreadyExisting) {
      const ref = new WeakRef(doc)
      this.documents.push(ref)
    }
    this.updateStyling()
  }

  /** Update <style> for all registered _documents */
  private updateStyling() {
    const css = this.generateCss()
    for (const docref of this.documents) {
      const doc = docref.deref()
      if (doc === undefined) continue
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

  /** Migration must occur only on background */
  async updateVersion() {
    if (this.storage.version !== defaultOptions.version) {
      await this.set("version", defaultOptions.version)
    }
  }
}

export default Config