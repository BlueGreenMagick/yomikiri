import { BrowserApi } from "~/browserApi";
import type { AnkiInfo, IAnkiOptions } from "../types/anki";
import type { NoteData } from "~/ankiNoteBuilder";
import Config from "~/config";
import Utils from "~/utils";
import { Platform } from ".";

interface Named {
  name: string;
}

interface RawNotetypeInfo {
  name: string;
  kind: "normal" | "cloze";
  fields: Named[];
}

interface RawAnkiInfo {
  decks: Named[];
  notetypes: RawNotetypeInfo[];
  profiles: Named[];
}

export namespace AnkiApi {
  const ANKI_MOBILE_INSTALL_LINK =
    "https://itunes.apple.com/us/app/ankimobile-flashcards/id373493387";

  let [_ankiInfoP, _ankiInfoResolve] = Utils.createPromise<AnkiInfo>();

  export function setAnkiInfo(ankiInfoJson: string): void {
    const rawAnkiInfo = JSON.parse(ankiInfoJson) as RawAnkiInfo;
    const ankiInfo: AnkiInfo = {
      decks: rawAnkiInfo.decks.map((named) => named.name),
      notetypes: rawAnkiInfo.notetypes.map((rawNotetype) => {
        return {
          name: rawNotetype.name,
          fields: rawNotetype.fields.map((named) => named.name),
        };
      }),
    };
    _ankiInfoResolve(ankiInfo);
  }

  export async function requestAnkiInfo(): Promise<void> {
    let installed = await Platform.messageWebview("ankiInfo", null);
    if (installed === false) {
      throw new Error(
        `<a href="${ANKI_MOBILE_INSTALL_LINK}">AnkiMobile</a> is not installed.`
      );
    }
  }

  export async function getAnkiInfo(): Promise<AnkiInfo> {
    return _ankiInfoP;
  }

  export async function checkConnection(): Promise<void> {
    let installed = await Platform.messageWebview("ankiIsInstalled", null);
    if (installed === false) {
      throw new Error(
        `<a href="${ANKI_MOBILE_INSTALL_LINK}">AnkiMobile</a> is not installed.`
      );
    }
  }
}

AnkiApi satisfies IAnkiOptions;
