import type { AnkiNote } from "@/features/anki";
import type { AnkiInfo } from "@/features/anki/ankiInfo";
import type { DesktopAnkiApi } from "../desktop";
import type { IosAnkiApi } from "../ios";
import type { IosAppAnkiApi } from "../iosapp";
import type { IPlatformConsts } from ".";

export interface AnkiAddNoteReq {
  note: AnkiNote;
  deferrable?: boolean;
}

export interface IAnkiOptions extends IPlatformConsts {
  /**
   * Throws an error if Anki (AnkiDroid, AnkiMobile) is not installed.
   * On desktop, also throws an error if anki or ankiconnect isn't running
   */
  requestAnkiInfo: () => Promise<void>;
  /** May not resolve on ios */
  getAnkiInfo: () => Promise<AnkiInfo>;
  /** Throws Error when failing to connect with message in html */
  checkConnection: () => Promise<void>;
}

export interface IAnkiAddNotes extends IPlatformConsts {
  /** Returns false if note is deferred */
  addNote: (arg: AnkiAddNoteReq) => Promise<boolean>;
}

export type ExtensionAnkiApi = DesktopAnkiApi | IosAnkiApi;
export type AnkiApi = DesktopAnkiApi | IosAnkiApi | IosAppAnkiApi;
export type AnkiOptionsApi = DesktopAnkiApi | IosAppAnkiApi;

export declare const AnkiApi: AnkiApi;
