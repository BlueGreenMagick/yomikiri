import { Platform } from ".";
import type { AnkiInfo, AnkiNote } from "@/features/anki";
import { YomikiriError } from "@/features/error";
import type { IAnkiAddNotes, IAnkiOptions } from "../types/anki";
import { iosAnkiMobileURL } from "../shared/anki";

export * from "../types/anki";

export interface Named {
  name: string;
}

export interface RawNotetypeInfo {
  name: string;
  kind: "normal" | "cloze";
  fields: Named[];
}

export interface RawAnkiInfo {
  decks: Named[];
  notetypes: RawNotetypeInfo[];
  profiles: Named[];
}

export class _IosAppAnkiApi implements IAnkiAddNotes, IAnkiOptions {
  readonly type = "iosapp";

  async requestAnkiInfo(): Promise<void> {
    const installed = await Platform.messageWebview("ankiInfo", null);
    if (!installed) {
      throw new YomikiriError(`AnkiMobile app is not installed.`);
    }
  }

  /** Can only be called in anki template options page */
  async getAnkiInfo(): Promise<AnkiInfo> {
    const rawAnkiInfo = await Platform.messageWebview("ankiInfoData", null);
    const ankiInfo: AnkiInfo = {
      decks: rawAnkiInfo.decks.map((named) => named.name),
      notetypes: rawAnkiInfo.notetypes.map((rawNotetype) => {
        return {
          name: rawNotetype.name,
          fields: rawNotetype.fields.map((named) => named.name),
        };
      }),
    };
    return ankiInfo;
  }

  async checkConnection(): Promise<void> {
    const installed = await Platform.messageWebview("ankiIsInstalled", null);
    if (!installed) {
      throw new YomikiriError(`AnkiMobile app is not installed.`);
    }
  }

  async addNote(note: AnkiNote): Promise<boolean> {
    const url = iosAnkiMobileURL(note);
    await Platform.messageWebview("openLink", url);
    return true;
  }
}

export const IosAppAnkiApi = new _IosAppAnkiApi();
export type IosAppAnkiApi = typeof IosAppAnkiApi;
export const AnkiApi = IosAppAnkiApi;
