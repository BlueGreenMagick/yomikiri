import { DesktopPlatform } from "@/platform/desktop";
import PopupPage from "./PopupPage.svelte";
import Config from "@/features/config";
import Utils, { exposeGlobals, LazyAsync } from "@/features/utils";
import type { AppCtx, DesktopCtx } from "@/features/ctx";
import { Toast } from "@/features/toast";

async function initialize(): Promise<AppCtx<DesktopCtx>> {
  const config = await Config.instance.get();
  const platform = DesktopPlatform;
  const toast = new Toast(new LazyAsync(() => config));

  return { config, platform, platformType: platform.type, toast };
}

const page = new PopupPage({
  target: document.body,
  props: { initialize },
});

exposeGlobals({
  Platform: DesktopPlatform,
  Utils,
  config: Config.instance,
  page,
});
