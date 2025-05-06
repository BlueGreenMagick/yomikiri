import { Platform, type DesktopPlatform, type IosPlatform } from "#platform";
import PopupPage from "./PopupPage.svelte";
import Config from "@/features/config";
import Utils, { exposeGlobals } from "@/features/utils";
import type { AppCtx } from "@/features/ctx";

async function initialize(): Promise<AppCtx> {
  const config = await Config.instance.get();
  const platform = Platform as DesktopPlatform | IosPlatform;
  return { config, platform };
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
