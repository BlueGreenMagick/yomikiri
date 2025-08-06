import type { AppCtx, DesktopCtx } from "@/features/ctx";
import { OptionsPage } from "@/features/options";
import Utils, { exposeGlobals } from "@/features/utils";
import { createPageDesktopCtx } from "@/platform/desktop/page/ctx";

async function initialize(): Promise<AppCtx<DesktopCtx>> {
  const ctx = createPageDesktopCtx();
  const config = await ctx.lazyConfig.get();

  exposeGlobals({
    Platform: ctx.platform,
    Backend: ctx.backend,
    Utils,
    config,
  });

  return { ...ctx, config };
}

const _page = new OptionsPage({
  target: document.body,
  props: { initialize },
});
