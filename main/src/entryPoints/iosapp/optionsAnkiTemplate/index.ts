import { IosAppPlatform } from "@/platform/iosapp";
import Utils, { exposeGlobals } from "@/features/utils";
import Config from "@/features/config";
import OptionsAnkiTemplatePage from "./OptionsAnkiTemplatePage.svelte";
import type { AppCtx } from "@/features/ctx";

async function initialize(): Promise<AppCtx> {
  const config = await Config.instance.get();
  const platform = IosAppPlatform;
  return { config, platform, platformType: platform.type };
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
