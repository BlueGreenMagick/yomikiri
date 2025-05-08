import { IosAppPlatform } from "@/platform/iosapp";
import Utils, { exposeGlobals, LazyAsync } from "@/features/utils";
import Config from "@/features/config";
import OptionsAnkiTemplatePage from "./OptionsAnkiTemplatePage.svelte";
import type { AppCtx, IosAppCtx } from "@/features/ctx";
import { Toast } from "@/features/toast/toast";

async function initialize(): Promise<AppCtx<IosAppCtx>> {
  const config = await Config.instance.get();
  const platform = IosAppPlatform;
  const toast = new Toast(new LazyAsync(() => config));
  return { config, platform, platformType: platform.type, toast };
}

const page = new OptionsAnkiTemplatePage({
  target: document.body,
  props: { initialize },
});

exposeGlobals({
  Platform: IosAppPlatform,
  config: Config.instance,
  page,
  Utils,
});
