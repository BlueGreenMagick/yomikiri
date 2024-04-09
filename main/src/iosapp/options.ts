import OptionsPage from "../components/options/OptionsPage.svelte";
import { Platform } from "~/platform/iosapp";
import { AnkiApi, IosAppAnkiApi } from "@platform/anki";
import Utils from "~/utils";
import Config from "~/config";
import { Backend } from "@platform/backend";
import type { IosAppDictionary } from "~/platform/common/dictionary";

declare global {
  interface Window {
    Utils: typeof Utils;
    AnkiApi: typeof AnkiApi;
    Config: typeof Config;
    Backend: typeof Backend;
  }
}

const platform = new Platform()
const initialized = initialize();

async function initialize(): Promise<[Config, IosAppAnkiApi, IosAppDictionary]> {
  const config = await Config.initialize(platform);
  config.setStyle(document);
  const ankiApi = platform.newAnkiApi(config)
  const dictionary = platform.newDictionary()
  return [config, ankiApi, dictionary]
}



const _optionsPage = new OptionsPage({
  target: document.body,
  props: { initialized, platform },
});

window.Utils = Utils;
window.AnkiApi = AnkiApi;
window.Config = Config;
window.Backend = Backend;
