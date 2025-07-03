import type { AppCtx, ForegroundDesktopCtx } from "@/features/ctx";
import { OptionsPage } from "@/features/options";
import { Toast } from "@/features/toast";
import Utils, { exposeGlobals } from "@/features/utils";
import { createDesktopCtxWithoutBackend, ForegroundDesktopBackend } from "@/platform/desktop";

async function initialize(): Promise<AppCtx<ForegroundDesktopCtx>> {
  const ctx = createDesktopCtxWithoutBackend();
  const backend = new ForegroundDesktopBackend();

  const config = await ctx.lazyConfig.get();
  const toast = new Toast(ctx.lazyConfig);

  exposeGlobals({
    Platform: ctx.platform,
    Backend: backend,
    Utils,
    config,
  });

  return { ...ctx, toast, config, backend };
}

const _page = new OptionsPage({
  target: document.body,
  props: { initialize },
});
