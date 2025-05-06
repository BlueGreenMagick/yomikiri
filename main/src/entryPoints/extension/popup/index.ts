import { Platform, type DesktopPlatform, type IosPlatform } from "#platform";
import PopupPage from "./PopupPage.svelte";
import Config from "@/features/config";
import Utils, { exposeGlobals, LazyAsync } from "@/features/utils";
import type { AppCtx, DesktopCtx, IosCtx } from "@/features/ctx";
import { Toast } from "@/features/toast";

async function initialize(): Promise<AppCtx<IosCtx | DesktopCtx>> {
  const config = await Config.instance.get();
  const platform = Platform as DesktopPlatform | IosPlatform;
  const toast = new Toast(new LazyAsync(() => config));
  if (platform.type === "desktop") {
    return { config, platform, platformType: platform.type, toast };
  } else {
    return { config, platform, platformType: platform.type, toast };
  }
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
