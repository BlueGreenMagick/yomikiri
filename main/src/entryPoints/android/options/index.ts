import type { AndroidCtx, AppCtx } from "@/features/ctx";
import { OptionsPage } from "@/features/options";
import { Toast } from "@/features/toast";
import Utils, { exposeGlobals } from "@/features/utils";
import { createAndroidCtx } from "@/platform/android";

async function initialize(): Promise<AppCtx<AndroidCtx>> {
  const ctx = createAndroidCtx();
  const config = await ctx.lazyConfig.get();
  const toast = new Toast(ctx.lazyConfig);

  exposeGlobals({
    Platform: ctx.platform,
    Utils,
    Backend: ctx.backend,
    config,
    page,
  });

  return { ...ctx, config, toast };
}

const page = new OptionsPage({
  target: document.body,
  props: { initialize },
});
