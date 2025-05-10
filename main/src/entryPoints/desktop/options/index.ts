import type { AppCtx, DesktopCtx } from "@/features/ctx";
import { OptionsPage } from "@/features/options";
import { Toast } from "@/features/toast";
import Utils, { exposeGlobals } from "@/features/utils";
import { createDesktopCtx } from "@/platform/desktop";

async function initialize(): Promise<AppCtx<DesktopCtx>> {
  const ctx = createDesktopCtx();

  const config = await ctx.lazyConfig.get();
  const toast = new Toast(ctx.lazyConfig);

  exposeGlobals({
    Platform: ctx.platform,
    Utils,
    config,
  });

  return { ...ctx, toast, config };
}

const _page = new OptionsPage({
  target: document.body,
  props: { initialize },
});
