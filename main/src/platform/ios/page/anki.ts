import type { Config } from "@/features/config";
import { YomikiriError } from "@/features/error";
import { currentTab, setStorage, updateTab } from "@/features/extension";
import type { LazyAsync } from "@/features/utils";
import { iosAnkiMobileURL } from "@/platform/shared/anki";
import type { AnkiAddNoteReq } from "@/platform/types/anki";

export class IosAnkiApiPage {
  constructor(private readonly lazyConfig: LazyAsync<Config>) {}

  async addNote({ note }: AnkiAddNoteReq): Promise<boolean> {
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
