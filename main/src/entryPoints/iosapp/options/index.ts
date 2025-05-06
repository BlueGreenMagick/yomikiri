import { OptionsPage } from "@/features/options";
import { IosAppPlatform } from "@/platform/iosapp";
import Utils, { exposeGlobals } from "@/features/utils";
import Config from "@/features/config";
import { Backend } from "@/platform/iosapp/backend";
import type { AppCtx, IosAppCtx } from "@/features/ctx";

async function initialize(): Promise<AppCtx<IosAppCtx>> {
  const config = await Config.instance.get();
  const platform = IosAppPlatform;
  return { config, platform };
}

const page = new OptionsPage({
  target: document.body,
  props: { initialize },
});

exposeGlobals({
  Platform: IosAppPlatform,
  Utils,
  Backend,
  config: Config.instance,
  page,
});
