import type { NoteData } from "~/ankiNoteBuilder";

export interface IAnkiOptions {
  requestAnkiInfo: () => void;
  canGetAnkiInfo: () => boolean;
  deckNames: () => Promise<string[]>;
  notetypeNames: () => Promise<string[]>;
  nodeTypeFields: (noteTypeName: string) => Promise<string[]>;
  checkConnection: () => Promise<void>;
}

export interface IAnkiAddNotes {
  addNote: (note: NoteData, tabId?: number) => Promise<void>;
}
