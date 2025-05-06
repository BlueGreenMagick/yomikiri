import DictionaryPage from "./DictionaryPage.svelte";
import Config from "@/features/config";
import Utils, { exposeGlobals } from "@/features/utils";
import { Platform } from "@/platform/iosapp";
import type { AppCtx } from "@/features/ctx";

const _page = createSvelte();

async function initialize(): Promise<AppCtx> {
  const config = await Config.instance.get();
  return {
    config,
  };
}

function createSvelte(): DictionaryPage {
  const params = new URLSearchParams(window.location.search);
  const context = params.get("context") as "app" | "action";
  const searchText = params.get("search") ?? "";
  return new DictionaryPage({
    target: document.body,
    props: { initialize, context, searchText },
  });
}

exposeGlobals({
  Platform,
  Utils,
  config: Config.instance,
});
