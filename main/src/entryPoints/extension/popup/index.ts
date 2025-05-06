import { ExtensionPlatform as Platform } from "#platform";
import PopupPage from "./PopupPage.svelte";
import Config from "@/features/config";
import Utils, { exposeGlobals } from "@/features/utils";
import type { AppCtx } from "@/features/ctx";

async function initialize(): Promise<AppCtx> {
  const config = await Config.instance.get();
  return { config };
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
