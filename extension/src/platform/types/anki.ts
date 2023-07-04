import type { NoteData } from "~/ankiNoteBuilder";
import type { AnkiInfo } from "../ios/anki";

export interface IAnkiApiStatic {
  /** Returns note id */
  addNote: (note: NoteData, tabId?: number) => Promise<void>;
  deckNames: () => Promise<string[]>;
  notetypeNames: () => Promise<string[]>;
  nodeTypeFields: (noteTypeName: string) => Promise<string[]>;
  checkConnection: () => Promise<void>;
}
