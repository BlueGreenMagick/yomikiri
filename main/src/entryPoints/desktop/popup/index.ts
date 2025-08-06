import type { AppCtx, DesktopCtx } from "@/features/ctx";
import Utils, { exposeGlobals } from "@/features/utils";
import { createPageDesktopCtx } from "@/platform/desktop/page/ctx";
import PopupPage from "./PopupPage.svelte";

async function initialize(): Promise<AppCtx<DesktopCtx>> {
  const ctx = createPageDesktopCtx();
  const config = await ctx.lazyConfig.get();

  exposeGlobals({
    Platform: ctx.platform,
    Backend: ctx.backend,
    Utils,
    config,
    page,
  });

  return { ...ctx, config };
}

const page = new PopupPage({
  target: document.body,
  props: { initialize },
});
