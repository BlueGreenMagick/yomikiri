import type { NoteData } from "~/ankiNoteBuilder";
import Utils from "~/utils";

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
  addNote: (note: NoteData, tabId?: number) => Promise<void>;
}

export function iosAnkiMobileURL(note: NoteData, successUrl?: string): string {
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
    params["x-success"] = successUrl
  }
  const url = "anki://x-callback-url/addnote?" + Utils.generateUrlParams(params);
  return url
}

export declare const AnkiApi: IAnkiAddNotes & IAnkiOptions