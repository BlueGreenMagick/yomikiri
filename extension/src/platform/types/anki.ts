import type { NoteData } from "~/anki";

export interface LoginStatus {
  username: string | null;
  loggedIn: boolean;
}

export interface IAnkiApiStatic {
  /** Returns note id */
  addNote: (note: NoteData) => Promise<number>;
  deckNames: () => Promise<string[]>;
  notetypeNames: () => Promise<string[]>;
  nodeTypeFields: (noteTypeName: string) => Promise<string[]>;
  checkConnection: () => Promise<void>;
  // ios methods
  loginStatus: () => Promise<LoginStatus>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
