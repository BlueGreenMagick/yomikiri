import type { AppCtx, DesktopCtx } from "@/features/ctx";
import { Toast } from "@/features/toast";
import Utils, { exposeGlobals } from "@/features/utils";
import { createPageDesktopCtx } from "@/platform/desktop/page/ctx";
import PopupPage from "./PopupPage.svelte";

async function initialize(): Promise<AppCtx<DesktopCtx>> {
  const ctx = createPageDesktopCtx();
  const config = await ctx.lazyConfig.get();
  const toast = new Toast(ctx.lazyConfig);

  exposeGlobals({
    Platform: ctx.platform,
    Backend: ctx.backend,
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
