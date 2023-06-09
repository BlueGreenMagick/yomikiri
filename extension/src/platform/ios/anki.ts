import { Api } from "~/api";
import type { IAnkiApiStatic } from "../types/anki";
import type { NoteData } from "~/anki";
import Config from "~/config";
import Utils from "~/utils";

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
const receivedAnkiInfoHandler: ((ankiInfo: AnkiInfo) => void)[] = [];

export default class AnkiApi {
  private static async requestAnkiInfo(): Promise<AnkiInfo> {
    const currentTab = await Api.currentTab();
    if (currentTab.id === undefined) {
      throw new Error("Tab does not have any id");
    }
    await Config.set("x-callback.tabId", currentTab.id);
    const redirectTo = "yomikiri://x-callback-url/infoForAdding";
    const ankiLink = `anki://x-callback-url/infoForAdding?x-success=${redirectTo}`;

    // This promise is resolved when response is received from Anki
    const [promise, resolve] = Utils.createPromise<AnkiInfo>();
    AnkiApi.onReceiveAnkiInfo((info) => {
      resolve(info);
    });
    // make request to Anki
    location.replace(ankiLink);
    return promise;
  }

  private static async maybeGetInfo(): Promise<AnkiInfo> {
    if (ankiInfo === undefined) {
      return await AnkiApi.requestAnkiInfo();
    } else {
      return ankiInfo;
    }
  }

  /**
   * Must be called on startup because
   * execution context may have been restarted
   */
  static onReceiveAnkiInfo(handler: (ankiInfo: AnkiInfo) => void) {
    if (receivedAnkiInfoHandler.length === 0) {
      AnkiApi.pollXSuccess(async () => {
        ankiInfo = await Api.requestToApp("ankiInfo", null);
        for (const handler of receivedAnkiInfoHandler) {
          handler(ankiInfo);
        }
      });
    }
    receivedAnkiInfoHandler.push(handler);
  }

  private static async pollXSuccess(handler: () => any) {
    const POLL_INTERVAL = 20;
    const thisTab = await Api.request("tabId", null);
    if (thisTab === undefined) {
      throw new Error("Could not get tab Id (Unreachable)");
    }

    const check = async () => {
      let tab = await Config.get("x-callback.successTabId");
      if (thisTab !== tab) return;
      await Config.set("x-callback.successTabId", null);
      handler();
    };

    // only have one poll function running concurrently
    const poll = async () => {
      await check();
      setTimeout(poll, POLL_INTERVAL);
    };
    setTimeout(poll, POLL_INTERVAL);
  }

  /**
   * This function must not be called in content script context.
   * Does not wait for note to actually be added to Anki.
   */
  static async addNote(note: NoteData): Promise<void> {
    const currentTab = await Api.currentTab();
    if (currentTab.id === undefined) {
      throw new Error("Current tab does not have an id");
    }
    await Config.set("x-callback.tabId", currentTab.id);

    const fields: Record<string, string> = {};
    for (const field of note.fields) {
      const queryKey = "fld" + field.name;
      fields[queryKey] = field.value;
    }
    const params = new URLSearchParams({
      type: note.notetype,
      deck: note.deck,
      tags: note.tags,
      // allow duplicate
      dupes: "1",
      ...fields,
      "x-success": "http://yomikiri-redirect.bluegreenmagick.com",
    });
    const ankiLink = "anki://x-callback-url/addnote?" + params.toString();
    Api.updateTab(currentTab.id, { url: ankiLink });
  }

  /** This promise may never resolve if use clicks cancel or AnkiMobile is not installed */
  static async deckNames(): Promise<string[]> {
    const ankiInfo = await AnkiApi.maybeGetInfo();
    return ankiInfo.decks.map((obj) => obj.name);
  }

  /** This promise may never resolve if use clicks cancel or AnkiMobile is not installed */
  static async notetypeNames(): Promise<string[]> {
    const ankiInfo = await AnkiApi.maybeGetInfo();
    return ankiInfo.notetypes.map((obj) => obj.name);
  }

  /** This promise may never resolve if use clicks cancel or AnkiMobile is not installed */
  static async nodeTypeFields(notetypeName: string): Promise<string[]> {
    const ankiInfo = await AnkiApi.maybeGetInfo();
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

AnkiApi satisfies IAnkiApiStatic;
