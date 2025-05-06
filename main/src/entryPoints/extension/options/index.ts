/* desktop only */

import { OptionsPage } from "@/features/options";
import Utils, { exposeGlobals, LazyAsync } from "@/features/utils";
import Config from "@/features/config";
import type { AppCtx, DesktopCtx } from "@/features/ctx";
import { DesktopPlatform } from "@/platform/desktop";
import { Toast } from "@/features/toast";

async function initialize(): Promise<AppCtx<DesktopCtx>> {
  const platform = DesktopPlatform;
  const config = await Config.instance.get();
  const toast = new Toast(new LazyAsync(() => config));

  return { config, platform, platformType: platform.type, toast };
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
