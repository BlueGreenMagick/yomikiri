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
import { iosAnkiMobileURL } from "../shared/anki";
import type { IAnkiAddNotes } from "@platform/anki";

export * from "../common/anki";

export namespace IosAnkiApi {
  /**
   * Does not wait for note to actually be added to Anki.
   */
  export async function addNote(note: AnkiNote): Promise<boolean> {
    if (EXTENSION_CONTEXT === "contentScript") {
      return message("addAnkiNote", note);
    }
    return _addNote(note);
  }

  async function _addNote(note: AnkiNote): Promise<boolean> {
    const cTab = await currentTab();
    const config = await Config.instance.get();
    const willAutoRedirect = config.get("anki.ios_auto_redirect");
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

IosAnkiApi satisfies IAnkiAddNotes;

export type IosAnkiApi = typeof IosAnkiApi;
export const AnkiApi = IosAnkiApi;
