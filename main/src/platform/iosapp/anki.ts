import Utils from "@/lib/utils";
import { Platform } from ".";
import type { AnkiNote } from "@/lib/anki";
import { YomikiriError } from "@/lib/error";
import {
  type AnkiInfo,
  type IAnkiAddNotes,
  type IAnkiOptions,
} from "../common/anki";
import { iosAnkiMobileURL } from "../shared/anki";

export * from "../common/anki";

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

export namespace IosAppAnkiApi {
  export const IS_DESKTOP = false;
  export const IS_IOS = false;
  export const IS_IOSAPP = true;
  export const IS_ANDROID = false;

  const [ankiInfoP, ankiInfoResolve, ankiInfoReject] =
    Utils.createPromise<AnkiInfo>();

  export function setAnkiInfo(ankiInfoJson: string): void {
    try {
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
      ankiInfoResolve(ankiInfo);
    } catch (err) {
      ankiInfoReject(err);
    }
  }

  export async function requestAnkiInfo(): Promise<void> {
    const installed = await Platform.messageWebview("ankiInfo", null);
    if (!installed) {
      throw new YomikiriError(`AnkiMobile app is not installed.`);
    }
  }

  export async function getAnkiInfo(): Promise<AnkiInfo> {
    return ankiInfoP;
  }

  export async function checkConnection(): Promise<void> {
    const installed = await Platform.messageWebview("ankiIsInstalled", null);
    if (!installed) {
      throw new YomikiriError(`AnkiMobile app is not installed.`);
    }
  }

  export async function addNote(note: AnkiNote): Promise<boolean> {
    const url = iosAnkiMobileURL(note);
    await Platform.messageWebview("openLink", url);
    return true;
  }
}

IosAppAnkiApi satisfies IAnkiAddNotes;
IosAppAnkiApi satisfies IAnkiOptions;

export type IosAppAnkiApi = typeof IosAppAnkiApi;
export const AnkiApi = IosAppAnkiApi;
