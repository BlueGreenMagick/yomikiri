import PopupPage from "./PopupPage.svelte";
import Utils, { exposeGlobals } from "@/features/utils";
import type { AppCtx, DesktopCtx } from "@/features/ctx";
import { Toast } from "@/features/toast";
import { createDesktopCtx } from "@/platform/desktop";

async function initialize(): Promise<AppCtx<DesktopCtx>> {
  const ctx = createDesktopCtx();
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
