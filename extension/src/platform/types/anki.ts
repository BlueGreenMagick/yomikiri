import type { NoteData } from "~/ankiNoteBuilder";

export interface IAnkiOptions {
  requestAnkiInfo: () => void;
  canGetAnkiInfo: () => Promise<boolean>;
  deckNames: () => Promise<string[]>;
  notetypeNames: () => Promise<string[]>;
  nodeTypeFields: (noteTypeName: string) => Promise<string[]>;
}

export interface IAnkiAddNotes {
  addNote: (note: NoteData, tabId?: number) => Promise<void>;
}
