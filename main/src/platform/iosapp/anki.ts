import type { AnkiInfo } from "@/features/anki";
import { YomikiriError } from "@/features/error";
import { iosAnkiMobileURL } from "../shared/anki";
import type { AnkiAddNoteReq, IAnkiAddNotes, IAnkiOptions } from "../types/anki";
import { sendMessage } from "./messaging";

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

export class IosAppAnkiApi implements IAnkiAddNotes, IAnkiOptions {
  readonly type = "iosapp";

  async requestAnkiInfo(): Promise<void> {
    const installed = await sendMessage("ankiInfo", null);
    if (!installed) {
      throw new YomikiriError(`AnkiMobile app is not installed.`);
    }
  }

  /** Can only be called in anki template options page */
  async getAnkiInfo(): Promise<AnkiInfo> {
    const rawAnkiInfo = await sendMessage("ankiInfoData", null);
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
    const installed = await sendMessage("ankiIsInstalled", null);
    if (!installed) {
      throw new YomikiriError(`AnkiMobile app is not installed.`);
    }
  }

  async addNote(req: AnkiAddNoteReq): Promise<boolean> {
    const url = iosAnkiMobileURL(req.note);
    await sendMessage("openLink", url);
    return true;
  }
}
