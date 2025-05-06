import { ExtensionPlatform as Platform } from "#platform";
import PopupPage from "./PopupPage.svelte";
import Config from "@/features/config";
import Utils, { exposeGlobals } from "@/features/utils";
import { Backend } from "#platform/backend";
import { AnkiApi } from "#platform/anki";
import type { AppContext } from "@/features/context";

async function initialize(): Promise<AppContext> {
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
  Backend,
  config: Config.instance,
  AnkiApi,
  page,
});
