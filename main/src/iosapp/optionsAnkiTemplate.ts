import { Platform } from "~/platform/iosapp";
import { IosAppAnkiApi } from "@platform/anki";
import { LazyAsync, exposeGlobals } from "~/utils";
import Config from "~/config";
import OptionsAnkiTemplatePage from "./OptionsAnkiTemplatePage.svelte";


const platform = new Platform()
const lazyConfig = new LazyAsync(() => Config.initialize(platform))

const initialized = initialize();

async function initialize(): Promise<[Config, IosAppAnkiApi]> {
  const config = await Config.initialize(platform);
  const ankiApi = platform.newAnkiApi(config)
  return [config, ankiApi]
}



const page = new OptionsAnkiTemplatePage({
  target: document.body,
  props: { platform, initialized },
});

exposeGlobals({
  platform,
  config: () => {
    void lazyConfig.get()
    return lazyConfig.getIfInitialized()
  },
  page
})