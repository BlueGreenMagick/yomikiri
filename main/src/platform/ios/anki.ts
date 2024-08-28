import {
  currentTab,
  message,
  setStorage,
  updateTab,
} from "extension/browserApi";
import type { AnkiNote } from "lib/anki";
import Config from "lib/config";
import { EXTENSION_CONTEXT } from "consts";
import { YomikiriError } from "lib/error";
import type { IAnkiAddNotes } from "../common/anki";
import { iosAnkiMobileURL } from "../shared/anki";

export class IosAnkiApi implements IAnkiAddNotes {
  config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Does not wait for note to actually be added to Anki.
   */
  async addNote(note: AnkiNote): Promise<boolean> {
    if (EXTENSION_CONTEXT === "contentScript") {
      return message("addAnkiNote", note);
    }
    return this._addNote(note);
  }

  async _addNote(note: AnkiNote): Promise<boolean> {
    const cTab = await currentTab();

    const willAutoRedirect = this.config.get("anki.ios_auto_redirect");
    if (willAutoRedirect) {
      if (cTab.id === undefined) {
        throw new YomikiriError("Current tab does not have an id");
      }
      await setStorage("x-callback.tabId", cTab.id);
      await setStorage("x-callback.tabUrl", location.href);
    }

    const ankiLink = iosAnkiMobileURL(
      note,
      willAutoRedirect ? "http://yomikiri-redirect.yoonchae.com" : undefined,
    );
    if (cTab.id !== undefined) {
      await updateTab(cTab.id, { url: ankiLink });
    } else {
      location.href = ankiLink;
    }

    return true;
  }
}

export const AnkiApi = IosAnkiApi;
export type AnkiApi = IosAnkiApi;
