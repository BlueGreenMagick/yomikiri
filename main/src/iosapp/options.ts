import OptionsPage from "../components/options/OptionsPage.svelte";
import { Platform } from "platform/iosapp";
import { IosAppAnkiApi } from "@platform/anki";
import Utils, { LazyAsync, exposeGlobals } from "lib/utils";
import Config from "lib/config";
import type { IosAppDictionary } from "platform/common/dictionary";


const platform = new Platform()
const lazyConfig = new LazyAsync(() => Config.initialize(platform))
const lazyAnkiApi = new LazyAsync(async () => platform.newAnkiApi(await lazyConfig.get()))
const dictionary = platform.newDictionary()

const initialized = initialize();

async function initialize(): Promise<[Config, IosAppAnkiApi, IosAppDictionary]> {
  const config = await lazyConfig.get();
  config.setStyle(document);
  const ankiApi = await lazyAnkiApi.get()
  return [config, ankiApi, dictionary]
}



const page = new OptionsPage({
  target: document.body,
  props: { initialized, platform },
});

exposeGlobals({
  platform,
  Utils,
  ankiApi: () => {
    void lazyAnkiApi.get()
    return lazyAnkiApi.getIfInitialized()
  },
  config: () => {
    void lazyConfig.get()
    return lazyConfig.getIfInitialized()
  },
  page
})