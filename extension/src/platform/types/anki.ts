import type { NoteData } from "~/anki";

export interface IAnkiApiStatic {
  /** Returns note id */
  addNote: (note: NoteData) => Promise<number>;
  checkConnection: () => Promise<string | null>;
  deckNames: () => Promise<string[]>;
  notetypeNames: () => Promise<string[]>;
  nodeTypeFields: (noteTypeName: string) => Promise<string[]>;
}
