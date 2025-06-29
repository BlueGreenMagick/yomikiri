import type { AnkiInfo, AnkiNote } from "@/features/anki";
import type { IAnkiAddNotes, IAnkiOptions } from "../types/anki";
import { sendMessage } from "./messaging";

export class AndroidAnkiApi implements IAnkiAddNotes, IAnkiOptions {
  readonly type = "android";

  async requestAnkiInfo(): Promise<void> {}

  async getAnkiInfo(): Promise<AnkiInfo> {
    return await sendMessage("ankiGetInfo", null);
  }

  async checkConnection(): Promise<void> {
    await sendMessage("ankiCheckConnection", null);
  }

  async addNote(note: AnkiNote): Promise<boolean> {
    return await sendMessage("ankiAddNote", {
      deck: note.deck,
      notetype: note.notetype,
      fields: note.fields,
      tags: note.tags,
    });
  }
}
