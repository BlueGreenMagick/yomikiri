import DictionaryPage from "./DictionaryPage.svelte";
import Config from "@/features/config";
import Utils, { exposeGlobals } from "@/features/utils";
import { IosAppPlatform } from "@/platform/iosapp";
import type { AppCtx, IosAppCtx } from "@/features/ctx";

const _page = createSvelte();

async function initialize(): Promise<AppCtx<IosAppCtx>> {
  const config = await Config.instance.get();
  const platform = IosAppPlatform;
  return {
    config,
    platform,
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
  Platform: IosAppPlatform,
  Utils,
  config: Config.instance,
});
