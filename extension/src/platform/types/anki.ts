import type { NoteData } from "~/ankiNoteBuilder";

export interface IAnkiOptions {
  requestAnkiInfo: () => void;
  canGetAnkiInfo: () => Promise<boolean>;
  deckNames: () => Promise<string[]>;
  notetypeNames: () => Promise<string[]>;
  nodeTypeFields: (noteTypeName: string) => Promise<string[]>;
  /** Throws Error when failing to connect */
  checkConnection: () => Promise<void>;
}

export interface IAnkiAddNotes {
  addNote: (note: NoteData, tabId?: number) => Promise<void>;
}
