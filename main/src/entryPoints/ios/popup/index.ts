import type { AppCtx, IosCtx } from "@/features/ctx";
import { Toast } from "@/features/toast";
import Utils, { exposeGlobals } from "@/features/utils";
import { createIosCtx } from "@/platform/ios";
import PopupPage from "./PopupPage.svelte";

async function initialize(): Promise<AppCtx<IosCtx>> {
  const ctx = createIosCtx();
  const config = await ctx.lazyConfig.get();
  const toast = new Toast(ctx.lazyConfig);

  exposeGlobals({
    Platform: ctx.platform,
    Utils,
    config,
    page,
  });

  return { ...ctx, config, toast };
}

const page = new PopupPage({
  target: document.body,
  props: { initialize },
});
