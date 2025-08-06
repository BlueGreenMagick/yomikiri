import type { AppCtx, IosAppCtx } from "@/features/ctx";
import { OptionsPage } from "@/features/options";
import Utils, { exposeGlobals } from "@/features/utils";
import { createIosAppCtx } from "@/platform/iosapp";

async function initialize(): Promise<AppCtx<IosAppCtx>> {
  const ctx = createIosAppCtx();
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
