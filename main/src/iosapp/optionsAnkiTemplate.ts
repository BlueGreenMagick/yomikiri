import { Platform } from "~/platform/iosapp";
import { AnkiApi, IosAppAnkiApi } from "@platform/anki";
import Utils from "~/utils";
import Config from "~/config";
import OptionsAnkiTemplatePage from "./OptionsAnkiTemplatePage.svelte";

declare global {
  interface Window {
    Utils: typeof Utils;
    AnkiApi: typeof AnkiApi;
    Config: typeof Config;
  }
}

const platform = new Platform()
const initialized = initialize();

async function initialize(): Promise<[Config, IosAppAnkiApi]> {
  const config = await Config.initialize(platform);
  const ankiApi = platform.newAnkiApi(config)
  return [config, ankiApi]
}



const _mainSvelte = new OptionsAnkiTemplatePage({
  target: document.body,
  props: { initialized },
});

window.Utils = Utils;
window.AnkiApi = AnkiApi;
window.Config = Config;
