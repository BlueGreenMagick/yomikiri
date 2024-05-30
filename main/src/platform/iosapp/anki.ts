import {
  iosAnkiMobileURL,
  type AnkiInfo,
  type IAnkiAddNotes,
  type IAnkiOptions,
} from "../common/anki";
import Utils from "lib/utils";
import type { IosAppPlatform } from ".";
import type { AnkiNote } from "lib/anki";

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

export class IosAppAnkiApi implements IAnkiOptions, IAnkiAddNotes {
  platform: IosAppPlatform;
  ankiInfoP: Promise<AnkiInfo>;
  ankiInfoResolve: Utils.PromiseResolver<AnkiInfo>;
  ankiInfoReject: Utils.PromiseRejector;

  constructor(platform: IosAppPlatform) {
    this.platform = platform;

    const [ankiInfoP, ankiInfoResolve, ankiInfoReject] =
      Utils.createPromise<AnkiInfo>();
    this.ankiInfoP = ankiInfoP;
    this.ankiInfoResolve = ankiInfoResolve;
    this.ankiInfoReject = ankiInfoReject;
  }

  setAnkiInfo(ankiInfoJson: string): void {
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
      this.ankiInfoResolve(ankiInfo);
    } catch (err) {
      this.ankiInfoReject(err);
    }
  }

  async requestAnkiInfo(): Promise<void> {
    const installed = await this.platform.messageWebview("ankiInfo", null);
    if (!installed) {
      throw new Error(`AnkiMobile app is not installed.`);
    }
  }

  async getAnkiInfo(): Promise<AnkiInfo> {
    return this.ankiInfoP;
  }

  async checkConnection(): Promise<void> {
    const installed = await this.platform.messageWebview(
      "ankiIsInstalled",
      null,
    );
    if (!installed) {
      throw new Error(`AnkiMobile app is not installed.`);
    }
  }

  async addNote(note: AnkiNote): Promise<boolean> {
    const url = iosAnkiMobileURL(note);
    await this.platform.messageWebview("openLink", url);
    return true;
  }
}

export const AnkiApi = IosAppAnkiApi;
export type AnkiApi = IosAppAnkiApi;
