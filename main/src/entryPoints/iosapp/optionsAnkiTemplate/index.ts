import type { AppCtx, IosAppCtx } from "@/features/ctx";
import Utils, { exposeGlobals } from "@/features/utils";
import { createIosAppCtx } from "@/platform/iosapp";
import OptionsAnkiTemplatePage from "./OptionsAnkiTemplatePage.svelte";

async function initialize(): Promise<AppCtx<IosAppCtx>> {
  const ctx = createIosAppCtx();
  const config = await ctx.lazyConfig.get();

  exposeGlobals({
    Platform: ctx.platform,
    config,
    Utils,
  });

  return { ...ctx, config };
}

const _page = new OptionsAnkiTemplatePage({
  target: document.body,
  props: { initialize },
});
