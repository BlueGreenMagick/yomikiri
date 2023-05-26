import type { NoteData } from "~/anki";

export interface Module {
  /** Send Anki-connect request */
  request: (action: string, params?: any) => Promise<any>;
  /** Returns note id */
  addNote: (note: NoteData) => Promise<number>;
  /** Returns null if successfully connected. Else returns an error string. */
  checkConnection: () => Promise<string | null>;
  deckNames: () => Promise<string[]>;
  notetypeNames: () => Promise<string[]>;
  nodeTypeFields: (noteTypeName: string) => Promise<string[]>;
  tags: () => Promise<string[]>;
}
