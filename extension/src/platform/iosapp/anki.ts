import { Api } from "~/api";
import type { IAnkiOptions } from "../types/anki";
import type { NoteData } from "~/ankiNoteBuilder";
import Config from "~/config";
import Utils from "~/utils";
import { Platform } from ".";

interface Named {
  name: string;
}

interface Notetype {
  name: string;
  kind: "normal" | "cloze";
  fields: Named[];
}

export interface AnkiInfo {
  decks: Named[];
  notetypes: Notetype[];
  profiles: Named[];
}

let ankiInfo: AnkiInfo | undefined;

// @ts-ignore
window.setAnkiInfo = (ankiInfoJson: string) => {
  ankiInfo = JSON.parse(ankiInfoJson);
};

export default class AnkiApi {
  static requestAnkiInfo(): Promise<boolean> {
    return Platform.messageWebview("ankiInfo", null);
  }

  static canGetAnkiInfo(): boolean {
    return ankiInfo !== undefined;
  }

  private static getAnkiInfo(): AnkiInfo {
    if (ankiInfo === undefined) {
      throw new Error("Did not get anki info");
    } else {
      return ankiInfo;
    }
  }

  /** This promise may never resolve if use clicks cancel or AnkiMobile is not installed */
  static async deckNames(): Promise<string[]> {
    const ankiInfo = await AnkiApi.getAnkiInfo();
    return ankiInfo.decks.map((obj) => obj.name);
  }

  /** This promise may never resolve if use clicks cancel or AnkiMobile is not installed */
  static async notetypeNames(): Promise<string[]> {
    const ankiInfo = await AnkiApi.getAnkiInfo();
    return ankiInfo.notetypes.map((obj) => obj.name);
  }

  /** This promise may never resolve if use clicks cancel or AnkiMobile is not installed */
  static async nodeTypeFields(notetypeName: string): Promise<string[]> {
    const ankiInfo = await AnkiApi.getAnkiInfo();
    const notetype = ankiInfo.notetypes.find((nt) => nt.name === notetypeName);
    if (notetype === undefined) {
      return [];
    }
    return notetype.fields.map((f) => f.name);
  }

  static async checkConnection(): Promise<void> {
    throw new Error("Unimplemented");
  }
}

AnkiApi satisfies IAnkiOptions;
