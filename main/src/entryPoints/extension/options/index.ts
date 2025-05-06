/* desktop only */

import { OptionsPage } from "@/features/options";
import { Platform } from "@/platform/desktop";
import Utils, { exposeGlobals } from "@/features/utils";
import Config from "@/features/config";
import type { AppCtx } from "@/features/ctx";

async function initialize(): Promise<AppCtx> {
  const config = await Config.instance.get();
  return { config };
}

const page = new OptionsPage({
  target: document.body,
  props: { initialize },
});

exposeGlobals({
  Platform,
  Utils,
  config: Config.instance,
  page,
});
