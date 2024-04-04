import { iosAnkiMobileURL, type AnkiInfo, type IAnkiAddNotes, type IAnkiOptions } from "../common/anki";
import Utils from "~/utils";
import { Platform } from ".";
import type { NoteData } from "~/ankiNoteBuilder";

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
  const [_ankiInfoP, _ankiInfoResolve] = Utils.createPromise<AnkiInfo>();

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
    const installed = await Platform.messageWebview("ankiInfo", null);
    if (!installed) {
      throw new Error(
        `AnkiMobile app is not installed.`
      );
    }
  }

  export async function getAnkiInfo(): Promise<AnkiInfo> {
    return _ankiInfoP;
  }

  export async function checkConnection(): Promise<void> {
    const installed = await Platform.messageWebview("ankiIsInstalled", null);
    if (!installed) {
      throw new Error(
        `AnkiMobile app is not installed.`
      );
    }
  }

  export async function addNote(note: NoteData): Promise<void> {
    const url = iosAnkiMobileURL(note)
    await Platform.messageWebview("openLink", url);
  }
}

AnkiApi satisfies IAnkiOptions;
AnkiApi satisfies IAnkiAddNotes;
