import type { AnkiInfo, AnkiNote } from "@/features/anki";
import type { IAnkiAddNotes } from "./anki";
import type { IAnkiOptions } from "./anki";

export * from "../types/anki";

export class _AndroidAnkiApi implements IAnkiAddNotes, IAnkiOptions {
  readonly type = "android";

  setAnkiInfo(_ankiInfoJson: string): void {
    throw new Error("Unimplemented");
  }

  async requestAnkiInfo(): Promise<void> {
    await Promise.resolve();
    throw new Error("Unimplemented");
  }

  async getAnkiInfo(): Promise<AnkiInfo> {
    await Promise.resolve();
    throw new Error("Unimplemented");
  }

  async checkConnection(): Promise<void> {
    await Promise.resolve();
    throw new Error("Unimplemented");
  }

  async addNote(_note: AnkiNote): Promise<boolean> {
    await Promise.resolve();
    throw new Error("Unimplemented");
  }
}

export const AndroidAnkiApi = new _AndroidAnkiApi();
export type AndroidAnkiApi = typeof AndroidAnkiApi;
export const AnkiApi = AndroidAnkiApi;
