import { Platform } from "platform/iosapp";
import { IosAppAnkiApi } from "@platform/anki";
import Utils, { exposeGlobals } from "lib/utils";
import Config from "lib/config";
import OptionsAnkiTemplatePage from "./OptionsAnkiTemplatePage.svelte";

const ankiApi = Platform.newAnkiApi();

const initialized = initialize();

async function initialize(): Promise<[Config, IosAppAnkiApi]> {
  const config = await Config.instance.get();
  config.setStyle(document);
  return [config, ankiApi];
}

const page = new OptionsAnkiTemplatePage({
  target: document.body,
  props: { initialized },
});

exposeGlobals({
  Platform,
  config: Config.instance,
  page,
  ankiApi,
  Utils,
});
