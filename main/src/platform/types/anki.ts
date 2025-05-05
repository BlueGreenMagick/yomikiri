import type { AnkiNote } from "@/features/anki";
import type { DesktopAnkiApi } from "../desktop/anki";
import type { IosAnkiApi } from "../ios/anki";
import type { IosAppAnkiApi } from "../iosapp/anki";
import type { IPlatformConsts } from ".";

export type { DesktopAnkiApi } from "../desktop/anki";
export type { IosAnkiApi } from "../ios/anki";
export type { IosAppAnkiApi } from "../iosapp/anki";

export interface NotetypeInfo {
  name: string;
  fields: string[];
}

export interface AnkiInfo {
  decks: string[];
  notetypes: NotetypeInfo[];
}

export interface IAnkiOptions extends IPlatformConsts {
  /**
   * On desktop, throws an error if anki is not installed or not running
   * On ios app, returns false if ankimobile is not installed.
   */
  requestAnkiInfo: () => Promise<void>;
  /** May not resolve on ios */
  getAnkiInfo: () => Promise<AnkiInfo>;
  /** Throws Error when failing to connect with message in html */
  checkConnection: () => Promise<void>;
}

export interface IAnkiAddNotes extends IPlatformConsts {
  /** Returns false if note is deferred */
  addNote: (note: AnkiNote, tabId?: number) => Promise<boolean>;
}

export type ExtensionAnkiApi = DesktopAnkiApi | IosAnkiApi;
export type AnkiApi = DesktopAnkiApi | IosAnkiApi | IosAppAnkiApi;
export type AnkiOptionsApi = DesktopAnkiApi | IosAppAnkiApi;

export declare const AnkiApi: AnkiApi;
