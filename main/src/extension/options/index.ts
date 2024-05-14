/* desktop only */

import { BrowserApi } from "~/extension/browserApi";
import OptionsPage from "../../components/options/OptionsPage.svelte";
import { Platform } from "~/platform/desktop";
import { DesktopAnkiApi } from "@platform/anki";
import Utils, { exposeGlobals } from "~/lib/utils";
import Config from "~/lib/config";
import type { DesktopDictionary } from "~/platform/common/dictionary";

const browserApi = new BrowserApi({ context: "page" });
const platform = new Platform(browserApi)
const lazyConfig = new Utils.LazyAsync(() => Config.initialize(platform))
const lazyAnkiApi = new Utils.LazyAsync(async () => platform.newAnkiApi(await lazyConfig.get()))
const dictionary = platform.newDictionary()

async function initialize(): Promise<[Config, DesktopAnkiApi, DesktopDictionary]> {
  const config = await lazyConfig.get();
  config.setStyle(document);
  const ankiApi = await lazyAnkiApi.get();
  return [config, ankiApi, dictionary]
}

const initialized = initialize();

const page = new OptionsPage({
  target: document.body,
  props: { platform, initialized },
});

exposeGlobals({
  platform,
  browserApi,
  Utils,
  ankiApi: () => {
    void lazyAnkiApi.get()
    return lazyAnkiApi.getIfInitialized()
  },
  config: () => {
    void lazyConfig.get()
    return lazyConfig.getIfInitialized()
  },
  dictionary,
  page
})