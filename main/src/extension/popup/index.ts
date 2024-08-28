import { ExtensionPlatform as Platform } from "@platform";
import PopupPage from "./PopupPage.svelte";
import Config from "lib/config";
import Utils, { exposeGlobals } from "lib/utils";
import { Backend } from "@platform/backend";
import { AnkiApi } from "@platform/anki";

const initialized = initialize();

async function initialize(): Promise<[AnkiApi]> {
  const ankiApi = await AnkiApi.instance.get();
  return [ankiApi];
}

const page = new PopupPage({
  target: document.body,
  props: { initialized },
});

exposeGlobals({
  Platform,
  Utils,
  Backend,
  config: Config.instance,
  ankiApi: AnkiApi.instance,
  page,
});
