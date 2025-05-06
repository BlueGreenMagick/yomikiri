/* desktop only */

import { OptionsPage } from "@/features/options";
import Utils, { exposeGlobals } from "@/features/utils";
import Config from "@/features/config";
import type { AppCtx, DesktopCtx } from "@/features/ctx";
import { DesktopPlatform } from "@/platform/desktop";

async function initialize(): Promise<AppCtx<DesktopCtx>> {
  const platform = DesktopPlatform;
  const config = await Config.instance.get();

  return { config, platform };
}

const page = new OptionsPage({
  target: document.body,
  props: { initialize },
});

exposeGlobals({
  Platform: DesktopPlatform,
  Utils,
  config: Config.instance,
  page,
});
