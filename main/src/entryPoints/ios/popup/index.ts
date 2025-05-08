import { IosPlatform } from "@/platform/ios";
import PopupPage from "./PopupPage.svelte";
import Config from "@/features/config";
import Utils, { exposeGlobals, LazyAsync } from "@/features/utils";
import type { AppCtx, IosCtx } from "@/features/ctx";
import { Toast } from "@/features/toast";

async function initialize(): Promise<AppCtx<IosCtx>> {
  const config = await Config.instance.get();
  const platform = IosPlatform;
  const toast = new Toast(new LazyAsync(() => config));
  return { config, platform, platformType: platform.type, toast };
}

const page = new PopupPage({
  target: document.body,
  props: { initialize },
});

exposeGlobals({
  Platform: IosPlatform,
  Utils,
  config: Config.instance,
  page,
});
