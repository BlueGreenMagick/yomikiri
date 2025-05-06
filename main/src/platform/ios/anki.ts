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
import { type IAnkiAddNotes } from "../types/anki";
import { LazyAsync } from "@/features/utils";

export * from "../types/anki";

class _IosAnkiApi implements IAnkiAddNotes {
  readonly type = "ios";
  readonly lazyConfig: LazyAsync<Config>;

  constructor(lazyConfig: LazyAsync<Config>) {
    this.lazyConfig = lazyConfig;
  }

  /**
   * Does not wait for note to actually be added to Anki.
   */
  readonly addNote = NonContentScriptFunction(
    "addAnkiNote",
    this._addNote.bind(this),
  );

  private async _addNote(note: AnkiNote): Promise<boolean> {
    const cTab = await currentTab();
    const config = await this.lazyConfig.get();
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

export const IosAnkiApi = new _IosAnkiApi(
  new LazyAsync(() => Config.instance.get()),
);
export const AnkiApi = IosAnkiApi;
export type IosAnkiApi = typeof IosAnkiApi;
