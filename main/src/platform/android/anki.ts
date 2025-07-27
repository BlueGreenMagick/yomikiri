import type { AnkiInfo } from "@/features/anki";
import type { AnkiAddNoteReq, IAnkiAddNotes, IAnkiOptions } from "../types/anki";
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

  async addNote({ note }: AnkiAddNoteReq): Promise<boolean> {
    return await sendMessage("ankiAddNote", note);
  }
}
