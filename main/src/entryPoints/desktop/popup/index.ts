import type { AppCtx, DesktopCtx } from "@/features/ctx";
import { Toast } from "@/features/toast";
import Utils, { exposeGlobals } from "@/features/utils";
import { createDesktopCtxWithoutBackend, ForegroundDesktopBackend } from "@/platform/desktop";
import PopupPage from "./PopupPage.svelte";

async function initialize(): Promise<AppCtx<DesktopCtx>> {
  const ctx = createDesktopCtxWithoutBackend();
  const backend = new ForegroundDesktopBackend();
  const config = await ctx.lazyConfig.get();
  const toast = new Toast(ctx.lazyConfig);

  exposeGlobals({
    Platform: ctx.platform,
    Backend: backend,
    Utils,
    config,
    page,
  });

  return { ...ctx, config, toast, backend };
}

const page = new PopupPage({
  target: document.body,
  props: { initialize },
});
