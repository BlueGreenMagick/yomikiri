import Api from "~/api";
import type { IAnkiApiStatic } from "../types/anki";
import type { NoteData } from "~/anki";

export default class AnkiApi {
  static async addNote(note: NoteData): Promise<number> {
    return await Api.requestToApp("addNote", note);
  }

  static async checkConnection(): Promise<string | null> {
    throw "Unimpplemented";
  }

  static async deckNames(): Promise<string[]> {
    return await Api.requestToApp("deckNames", null);
  }

  static async notetypeNames(): Promise<string[]> {
    return await Api.requestToApp("notetypeNames", null);
  }

  static async nodeTypeFields(notetypeName: string): Promise<string[]> {
    return await Api.requestToApp("notetypeFields", notetypeName);
  }

  static async sync(): Promise<null> {
    return await Api.requestToApp("ankiSync", null);
  }

  static async login(username: string, password: string): Promise<null> {
    return await Api.requestToApp("ankiLogin", [username, password]);
  }
}

AnkiApi satisfies IAnkiApiStatic;
