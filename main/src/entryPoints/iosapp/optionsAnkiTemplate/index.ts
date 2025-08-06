import type { AppCtx, IosAppCtx } from "@/features/ctx";
import { Toast } from "@/features/toast/toast";
import Utils, { exposeGlobals } from "@/features/utils";
import { createIosAppCtx } from "@/platform/iosapp";
import OptionsAnkiTemplatePage from "./OptionsAnkiTemplatePage.svelte";

async function initialize(): Promise<AppCtx<IosAppCtx>> {
  const ctx = createIosAppCtx();
  const toast = new Toast();
  const config = await ctx.lazyConfig.get();

  exposeGlobals({
    Platform: ctx.platform,
    config,
    Utils,
  });

  return { ...ctx, config, toast };
}

const _page = new OptionsAnkiTemplatePage({
  target: document.body,
  props: { initialize },
});
