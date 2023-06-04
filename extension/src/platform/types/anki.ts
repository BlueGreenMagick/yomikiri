import type { NoteData } from "~/anki";
import type { AnkiInfo } from "../ios/anki";

export interface IAnkiApiStatic {
  /** Returns note id */
  addNote: (note: NoteData) => Promise<number>;
  deckNames: () => Promise<string[]>;
  notetypeNames: () => Promise<string[]>;
  nodeTypeFields: (noteTypeName: string) => Promise<string[]>;
  checkConnection: () => Promise<void>;
  /** iOS only */
  onReceiveAnkiInfo: (handler: (ankiInfo: AnkiInfo) => void) => void;
}
