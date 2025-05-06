import { Platform } from "@/platform/iosapp";
import Utils, { exposeGlobals } from "@/features/utils";
import Config from "@/features/config";
import OptionsAnkiTemplatePage from "./OptionsAnkiTemplatePage.svelte";
import type { AppCtx } from "@/features/ctx";

async function initialize(): Promise<AppCtx> {
  const config = await Config.instance.get();
  return { config };
}

const page = new OptionsAnkiTemplatePage({
  target: document.body,
  props: { initialize },
});

exposeGlobals({
  Platform,
  config: Config.instance,
  page,
  Utils,
});
