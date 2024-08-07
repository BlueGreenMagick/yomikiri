import type { AnkiNote } from "lib/anki";
import Utils from "lib/utils";
import type { DesktopAnkiApi } from "../desktop/anki";
import type { IosAnkiApi } from "../ios/anki";
import type { IosAppAnkiApi } from "../iosapp/anki";

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

export interface IAnkiOptions {
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

export interface IAnkiAddNotes {
  /** Returns false if note is deferred */
  addNote: (note: AnkiNote, tabId?: number) => Promise<boolean>;
}

export function iosAnkiMobileURL(note: AnkiNote, successUrl?: string): string {
  const fields: Record<string, string> = {};
  for (const field of note.fields) {
    const queryKey = "fld" + field.name;
    fields[queryKey] = field.value;
  }
  const params: Record<string, string> = {
    type: note.notetype,
    deck: note.deck,
    tags: note.tags,
    // allow duplicate
    dupes: "1",
    ...fields,
  };
  if (typeof successUrl === "string") {
    params["x-success"] = successUrl;
  }
  const url =
    "anki://x-callback-url/addnote?" + Utils.generateUrlParams(params);
  return url;
}

export type ExtensionAnkiApi = DesktopAnkiApi | IosAnkiApi;
export type AnkiApi = DesktopAnkiApi | IosAnkiApi | IosAppAnkiApi;
export type AnkiOptionsApi = DesktopAnkiApi | IosAppAnkiApi;

export declare const AnkiApi:
  | typeof DesktopAnkiApi
  | typeof IosAnkiApi
  | typeof IosAppAnkiApi;
