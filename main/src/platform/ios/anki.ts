import {
  currentTab,
  NonContentScriptFunction,
  setStorage,
  updateTab,
} from "@/features/extension/browserApi";
import type { AnkiNote } from "@/features/anki";
import Config from "@/features/config";
import { YomikiriError } from "@/features/error";
import { iosAnkiMobileURL } from "../shared/anki";
import type { IAnkiAddNotes } from "../types/anki";

export * from "../types/anki";

export namespace IosAnkiApi {
  export const IS_DESKTOP = false;
  export const IS_IOS = true;
  export const IS_IOSAPP = false;
  export const IS_ANDROID = false;

  /**
   * Does not wait for note to actually be added to Anki.
   */
  export const addNote = NonContentScriptFunction("addAnkiNote", _addNote);

  async function _addNote(note: AnkiNote): Promise<boolean> {
    const cTab = await currentTab();
    const config = await Config.instance.get();
    const willAutoRedirect = config.get("anki.ios_auto_redirect");
    if (willAutoRedirect) {
      if (cTab.id === undefined) {
        throw new YomikiriError("Current tab does not have an id");
      }
      await setStorage("x-callback.tabId", cTab.id);
      await setStorage("x-callback.tabUrl", cTab.url ?? cTab.pendingUrl ?? "");
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
