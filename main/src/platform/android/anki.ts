import type { AnkiNote } from "@/features/anki";
import type { AnkiInfo } from "./anki";
import type { IAnkiAddNotes } from "./anki";
import type { IAnkiOptions } from "./anki";

export * from "../types/anki";

export namespace AndroidAnkiApi {
  export const IS_DESKTOP = false;
  export const IS_IOS = false;
  export const IS_IOSAPP = false;
  export const IS_ANDROID = true;

  export function setAnkiInfo(_ankiInfoJson: string): void {
    throw new Error("Unimplemented");
  }

  export async function requestAnkiInfo(): Promise<void> {
    await Promise.resolve();
    throw new Error("Unimplemented");
  }

  export async function getAnkiInfo(): Promise<AnkiInfo> {
    await Promise.resolve();
    throw new Error("Unimplemented");
  }

  export async function checkConnection(): Promise<void> {
    await Promise.resolve();
    throw new Error("Unimplemented");
  }

  export async function addNote(_note: AnkiNote): Promise<boolean> {
    await Promise.resolve();
    throw new Error("Unimplemented");
  }
}

AndroidAnkiApi satisfies IAnkiAddNotes;
AndroidAnkiApi satisfies IAnkiOptions;

export type AndroidAnkiApi = typeof AndroidAnkiApi;
export const AnkiApi = AndroidAnkiApi;
