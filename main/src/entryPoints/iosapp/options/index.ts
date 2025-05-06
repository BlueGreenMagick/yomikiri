import { OptionsPage } from "@/features/options";
import { Platform } from "@/platform/iosapp";
import Utils, { exposeGlobals } from "@/features/utils";
import Config from "@/features/config";
import { AnkiApi } from "@/platform/iosapp/anki";
import { Backend } from "@/platform/iosapp/backend";
import type { AppContext } from "@/features/context";

async function initialize(): Promise<AppContext> {
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
  AnkiApi,
  Backend,
  config: Config.instance,
  page,
});
