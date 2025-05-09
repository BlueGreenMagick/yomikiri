import { OptionsPage } from "@/features/options";
import Utils, { exposeGlobals } from "@/features/utils";
import type { AppCtx, IosAppCtx } from "@/features/ctx";
import { Toast } from "@/features/toast";
import { createIosAppCtx } from "@/platform/iosapp";

async function initialize(): Promise<AppCtx<IosAppCtx>> {
  const ctx = createIosAppCtx();
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
