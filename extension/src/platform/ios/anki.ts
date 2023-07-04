import { Api } from "~/api";
import type { IAnkiApiStatic } from "../types/anki";
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

export default class AnkiApi {
  /** Should only be called in app */
  private static async maybeGetInfo(): Promise<AnkiInfo> {
    if (ankiInfo === undefined) {
      return await Platform.messageWebview("ankiInfo", null);
    } else {
      return ankiInfo;
    }
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
    const params = {
      type: note.notetype,
      deck: note.deck,
      tags: note.tags,
      // allow duplicate
      dupes: "1",
      ...fields,
      "x-success": "http://yomikiri-redirect.bluegreenmagick.com",
    };
    const ankiLink = "anki://x-callback-url/addnote?" + Utils.urlParams(params);
    console.log(ankiLink);
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
