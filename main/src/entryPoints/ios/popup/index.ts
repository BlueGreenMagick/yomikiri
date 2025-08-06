import type { AppCtx, IosCtx } from "@/features/ctx";
import { Toast } from "@/features/toast";
import Utils, { exposeGlobals } from "@/features/utils";
import { createIosPageCtx } from "@/platform/ios/page/ctx";
import PopupPage from "./PopupPage.svelte";

async function initialize(): Promise<AppCtx<IosCtx>> {
  const ctx = createIosPageCtx();
  const toast = new Toast();
  const config = await ctx.lazyConfig.get();

  exposeGlobals({
    Platform: ctx.platform,
    Utils,
    config,
    page,
  });

  return { ...ctx, config, toast };
}

const page = new PopupPage({
  target: document.body,
  props: { initialize },
});
