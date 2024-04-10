import { Platform } from "@platform-ext";
import PopupPage from "./PopupPage.svelte";
import Config from "~/config";
import Utils, { LazyAsync, exposeGlobals } from "~/utils";
import { BrowserApi } from "~/extension/browserApi";
import type { Backend } from "@platform/backend"


const browserApi = new BrowserApi({ context: "popup" });
const platform = new Platform(browserApi)
const lazyConfig = new LazyAsync(() => Config.initialize(platform))
const lazyBackend = new LazyAsync(() => platform.newBackend())

const initialized = initialize();

async function initialize(): Promise<[Config, Backend]> {
  const config = await lazyConfig.get()
  config.setStyle(document);
  const backend = await lazyBackend.get()
  return [config, backend]
}

const page = new PopupPage({ target: document.body, props: { platform, initialized } });

exposeGlobals({
  platform,
  browserApi,
  Utils,
  backend: () => {
    void lazyBackend.get()
    return lazyBackend.getIfInitialized()
  },
  config: () => {
    void lazyConfig.get()
    return lazyConfig.getIfInitialized()
  },
  page
})