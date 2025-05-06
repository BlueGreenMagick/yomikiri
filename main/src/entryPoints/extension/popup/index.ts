import { Platform } from "#platform";
import PopupPage from "./PopupPage.svelte";
import Config from "@/features/config";
import Utils, { exposeGlobals } from "@/features/utils";
import type { AppCtx, DesktopCtx, IosCtx } from "@/features/ctx";

async function initialize(): Promise<AppCtx<IosCtx | DesktopCtx>> {
  const config = await Config.instance.get();
  const platform = Platform;
  return { config, platform } as AppCtx<IosCtx | DesktopCtx>;
}

const page = new PopupPage({
  target: document.body,
  props: { initialize },
});

exposeGlobals({
  Platform,
  Utils,
  config: Config.instance,
  page,
});
