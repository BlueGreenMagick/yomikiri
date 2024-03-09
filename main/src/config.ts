import type { NoteData } from "~/ankiNoteBuilder";
import { Platform } from "@platform";
import { VERSION } from "./generated";

/** Must not be undefined */
export interface Configuration {
  "state.enabled": boolean;
  "general.font_size": number;
  "general.font": string;
  "anki.connect_port": number;
  "anki.connect_url": string;
  "anki.template": NoteData | null;
  "anki.enabled": boolean;
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

  let _storage: StoredConfiguration;
  let _styleEl: HTMLStyleElement | undefined;

  /** Platform must be initialized. */
  export async function initialize(): Promise<void> {
    _storage = await Platform.loadConfig();
    migrate()

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

  /** Insert or update <style> properties from config */
  export function setStyle(document: Document) {
    const css = generateCss();
    let styleEl = document.getElementById(STYLE_ELEMENT_ID);
    if (styleEl === null) {
      styleEl = document.createElement("style");
      styleEl.id = STYLE_ELEMENT_ID;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
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

  function migrate() {
    if (_storage["version"] !== defaultOptions["version"]) {
      set("version", defaultOptions["version"])
    }
  }
}

export default Config;
