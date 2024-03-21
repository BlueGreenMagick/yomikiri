import { BrowserApi } from "~/extension/browserApi";
import { iosAnkiMobileURL, type IAnkiAddNotes } from "../common/anki";
import type { NoteData } from "~/ankiNoteBuilder";
import Config from "~/config";
import Utils from "~/utils";

export namespace AnkiApi {
  /**
   * Does not wait for note to actually be added to Anki.
   */
  export async function addNote(note: NoteData): Promise<void> {
    if (BrowserApi.context === "contentScript") {
      return BrowserApi.request("addAnkiNote", note);
    }
    return _addNote(note);
  }

  async function _addNote(note: NoteData): Promise<void> {
    const currentTab = await BrowserApi.currentTab();

    let willAutoRedirect = Config.get("anki.ios_auto_redirect")
    if (willAutoRedirect) {
      if (currentTab.id === undefined) {
        throw new Error("Current tab does not have an id");
      }
      await BrowserApi.setStorage("x-callback.tabId", currentTab.id);
      await BrowserApi.setStorage("x-callback.tabUrl", location.href);
    }

    const ankiLink = iosAnkiMobileURL(note, willAutoRedirect ? "http://yomikiri-redirect.yoonchae.com" : undefined)
    if (currentTab.id !== undefined) {
      BrowserApi.updateTab(currentTab.id, { url: ankiLink });
    } else {
      location.href = ankiLink;
    }
  }
}

AnkiApi satisfies IAnkiAddNotes;
