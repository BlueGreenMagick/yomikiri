import type { AppCtx, IosAppCtx } from "@/features/ctx";
import Utils, { exposeGlobals } from "@/features/utils";
import { createIosAppCtx } from "@/platform/iosapp";
import DictionaryPage from "./DictionaryPage.svelte";

const _page = createSvelte();

async function initialize(): Promise<AppCtx<IosAppCtx>> {
  const ctx = createIosAppCtx();
  const config = await ctx.lazyConfig.get();

  exposeGlobals({
    Platform: ctx.platform,
    Utils,
    config,
  });

  return { ...ctx, config };
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
