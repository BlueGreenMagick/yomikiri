import type { NoteData } from "~/ankiNoteBuilder";
import { Platform } from "@platform";
import { VERSION } from "./generated";
import type { TTSVoice } from "./platform/common";

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
}

const defaultOptions: Configuration = {
  "state.enabled": true,
  "general.font_size": 14,
  "general.font": "Meiryo",
  "anki.connect_port": 8765,
  "anki.connect_url": "http://127.0.0.1",
  "anki.template": null,
  "anki.enabled": false,
  "anki.ios_auto_redirect": true,
  "tts.voice": null,
  "version": VERSION
};

export interface StoredConfiguration extends Partial<Configuration> {
  [key: string]: any;
}

/** Get union of config keys that extends type T. */
export type ConfigKeysOfType<T> = {
  [K in keyof Configuration]: Configuration[K] extends T ? K : never;
}[keyof Configuration];

export namespace Config {
  const STYLE_ELEMENT_ID = "yomikiri-addon-css-styling";

  export let initialized: boolean = false;

  export let _storage: StoredConfiguration;
  let _subscribers: (() => any)[] = []
  let _documents: WeakRef<Document>[] = []

  /** Platform must be initialized. */
  export async function initialize(): Promise<void> {
    _storage = await Platform.getConfig();

    for (const subscriber of _subscribers) {
      subscriber();
    }

    Platform.subscribeConfig((stored) => {
      _storage = stored;
      for (const subscriber of _subscribers) {
        subscriber();
      }
    });

    migrate()
    Config.onChange(() => {
      updateStyling()
    })

    Config.initialized = true;

  }

  export function get<K extends keyof Configuration>(key: K): Configuration[K] {
    const value = _storage[key];
    return value !== undefined
      ? (value as Configuration[K])
      : defaultOptions[key];
  }

  /** 
   * To remove from storage, set value to `undefined`.
   * 
   * If `save` is `false`, only updates config values in this context.
   */
  export async function set<K extends keyof Configuration>(
    key: K,
    value: Configuration[K],
    save: boolean = true
  ): Promise<void> {
    if (value === undefined) {
      delete _storage[key];
    } else {
      _storage[key] = value;
    }
    if (save) {
      await Config.save()
    }
  }

  export async function save(): Promise<void> {
    await Platform.saveConfig(_storage);
  }

  export function defaultValue<K extends keyof Configuration>(
    key: K
  ): Configuration[K] {
    return defaultOptions[key];
  }

  /** 
   * If Config is initialized, subscriber will run immediately.
   * 
   * If Config isn't initialized yet, it will run on initialization.
   */
  export function onChange(subscriber: () => void): void {
    _subscribers.push(subscriber)
    if (Config.initialized) {
      subscriber()
    }
  }

  export function removeOnChange(subscriber: () => void): boolean {
    const idx = _subscribers.indexOf(subscriber);
    if (idx !== -1) {
      _subscribers.splice(idx, 1);
      return true
    }
    return false
  }

  /** 
   * Insert or update <style> properties from config,
   * watch for config changes and auto-update <style>
  */
  export function setStyle(doc: Document) {
    let alreadyExisting = false;
    for (const docRef of _documents) {
      const derefed = docRef.deref();
      if (derefed === undefined) continue;
      if (derefed === doc) {
        alreadyExisting = true
        break;
      }
    }
    if (!alreadyExisting) {
      let ref = new WeakRef(doc)
      _documents.push(ref)
    }
    updateStyling()
  }

  /** Update <style> for all registered _documents */
  function updateStyling() {
    const css = generateCss()
    for (const docref of _documents) {
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

  function generateCss(): string {
    const fontSize = Config.get("general.font_size");
    const font = Config.get("general.font");
    const escapedFont = font.replace('"', '\\"').replace("\\", "\\\\");

    return `:root {
--font-size: ${fontSize}px;
--japanese-font: "${escapedFont}";
    }`;
  }

  // Make sure no race condition with migration occurs!
  function migrate() {
    if (_storage["version"] !== defaultOptions["version"]) {
      set("version", defaultOptions["version"])
    }
  }
}

export default Config;
