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

export namespace AnkiApi {
  export function requestAnkiInfo(): Promise<boolean> {
    return Platform.messageWebview("ankiInfo", null);
  }

  export async function canGetAnkiInfo(): Promise<boolean> {
    return ankiInfo !== undefined;
  }

  function getAnkiInfo(): AnkiInfo {
    if (ankiInfo === undefined) {
      throw new Error("Did not get anki info");
    } else {
      return ankiInfo;
    }
  }

  /** This promise may never resolve if use clicks cancel or AnkiMobile is not installed */
  export async function deckNames(): Promise<string[]> {
    const ankiInfo = getAnkiInfo();
    return ankiInfo.decks.map((obj) => obj.name);
  }

  /** This promise may never resolve if use clicks cancel or AnkiMobile is not installed */
  export async function notetypeNames(): Promise<string[]> {
    const ankiInfo = getAnkiInfo();
    return ankiInfo.notetypes.map((obj) => obj.name);
  }

  /** This promise may never resolve if use clicks cancel or AnkiMobile is not installed */
  export async function nodeTypeFields(
    notetypeName: string
  ): Promise<string[]> {
    const ankiInfo = getAnkiInfo();
    const notetype = ankiInfo.notetypes.find((nt) => nt.name === notetypeName);
    if (notetype === undefined) {
      return [];
    }
    return notetype.fields.map((f) => f.name);
  }

  export async function checkConnection(): Promise<void> {
    let installed = await Platform.messageWebview("ankiIsInstalled", null);
    if (installed === false) {
      throw new Error(
        "<a href='https://itunes.apple.com/us/app/ankimobile-flashcards/id373493387'>AnkiMobile</a> is not installed."
      );
    }
  }
}

AnkiApi satisfies IAnkiOptions;
