import { BrowserApi } from "~/extension/browserApi";
import { iosAnkiMobileURL, type IAnkiAddNotes } from "../common/anki";
import type { NoteData } from "~/ankiNoteBuilder";
import Config from "~/config";
import {Platform as IosPlatform} from "./"

class IosAnkiApi implements IAnkiAddNotes{
  browserApi: BrowserApi
  config: Config

  constructor(platform: IosPlatform, config: Config) {
    this.browserApi = platform.browserApi
    this.config = config
  }

  /**
   * Does not wait for note to actually be added to Anki.
   */
  async addNote(note: NoteData): Promise<void> {
    if (this.browserApi.context === "contentScript") {
      return this.browserApi.request("addAnkiNote", note);
    }
    return this._addNote(note);
  }

  async _addNote(note: NoteData): Promise<void> {
    const currentTab = await this.browserApi.currentTab();

    const willAutoRedirect = this.config.get("anki.ios_auto_redirect")
    if (willAutoRedirect) {
      if (currentTab.id === undefined) {
        throw new Error("Current tab does not have an id");
      }
      await this.browserApi.setStorage("x-callback.tabId", currentTab.id);
      await this.browserApi.setStorage("x-callback.tabUrl", location.href);
    }

    const ankiLink = iosAnkiMobileURL(note, willAutoRedirect ? "http://yomikiri-redirect.yoonchae.com" : undefined)
    if (currentTab.id !== undefined) {
      this.browserApi.updateTab(currentTab.id, { url: ankiLink });
    } else {
      location.href = ankiLink;
    }
  }
}

export const AnkiApi = IosAnkiApi
export type AnkiApi = IosAnkiApi
