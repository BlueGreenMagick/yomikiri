import type { AppCtx, DesktopCtx } from "@/features/ctx";
import { OptionsPage } from "@/features/options";
import { Toast } from "@/features/toast";
import Utils, { exposeGlobals } from "@/features/utils";
import { createPageDesktopCtx } from "@/platform/desktop/page/ctx";

async function initialize(): Promise<AppCtx<DesktopCtx>> {
  const ctx = createPageDesktopCtx();

  const config = await ctx.lazyConfig.get();
  const toast = new Toast(ctx.lazyConfig);

  exposeGlobals({
    Platform: ctx.platform,
    Backend: ctx.backend,
    Utils,
    config,
  });

  return { ...ctx, toast, config };
}

const _page = new OptionsPage({
  target: document.body,
  props: { initialize },
});
