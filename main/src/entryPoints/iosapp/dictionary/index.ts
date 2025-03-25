import { Backend } from "#platform/backend";
import DictionaryPage from "./DictionaryPage.svelte";
import Config from "@/lib/config";
import Utils, { exposeGlobals } from "@/lib/utils";
import { AnkiApi } from "@/platform/iosapp/anki";
import { Platform } from "@/platform/iosapp";

const _page = createSvelte();

function createSvelte(): DictionaryPage {
  const params = new URLSearchParams(window.location.search);
  const context = params.get("context") as "app" | "action";
  const searchText = params.get("search") ?? "";
  return new DictionaryPage({
    target: document.body,
    props: { context, searchText },
  });
}

exposeGlobals({
  Platform,
  Utils,
  config: Config.instance,
  Backend,
  AnkiApi,
});
