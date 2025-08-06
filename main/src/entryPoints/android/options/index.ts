import type { AndroidCtx, AppCtx } from "@/features/ctx";
import { OptionsPage } from "@/features/options";
import Utils, { exposeGlobals } from "@/features/utils";
import { createAndroidCtx } from "@/platform/android";

async function initialize(): Promise<AppCtx<AndroidCtx>> {
  const ctx = createAndroidCtx();
  const config = await ctx.lazyConfig.get();

  exposeGlobals({
    Platform: ctx.platform,
    Utils,
    Backend: ctx.backend,
    config,
    page,
  });

  return { ...ctx, config };
}

const page = new OptionsPage({
  target: document.body,
  props: { initialize },
});
