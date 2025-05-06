import DictionaryPage from "./DictionaryPage.svelte";
import Config from "@/features/config";
import Utils, { exposeGlobals, LazyAsync } from "@/features/utils";
import { IosAppPlatform } from "@/platform/iosapp";
import type { AppCtx, IosAppCtx } from "@/features/ctx";
import { Toast } from "@/features/toast";

const _page = createSvelte();

async function initialize(): Promise<AppCtx<IosAppCtx>> {
  const platform = IosAppPlatform;
  const config = await Config.instance.get();
  const toast = new Toast(new LazyAsync(() => config));

  return {
    config,
    platform,
    platformType: platform.type,
    toast,
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
