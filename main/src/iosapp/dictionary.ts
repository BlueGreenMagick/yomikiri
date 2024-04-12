import DictionaryPage from "./DictionaryPage.svelte";
import Config from "~/config";
import Utils, { LazyAsync, exposeGlobals } from "~/utils";
import { Platform } from "~/platform/iosapp";
import { updateTTSAvailability } from "~/common";
import type { IosAppBackend } from "~/platform/iosapp/backend";


const platform = new Platform()
const initialized = initialize();
const lazyConfig = new LazyAsync(() => Config.initialize(platform))
const backend = platform.newBackend()

createSvelte(initialized);

async function initialize(): Promise<[Config, IosAppBackend]> {
  const config = await lazyConfig.get()
  config.setStyle(document);

  // queue task to run later
  setTimeout(() => { void deferredInitialize(config) }, 0);
  return [config, backend]
}

/** Non-essential code to run at startup but not immediately */
async function deferredInitialize(config: Config): Promise<void> {
  await updateTTSAvailability(platform, config);
}

function createSvelte(initialized: Promise<[Config, IosAppBackend]>): DictionaryPage {
  const params = new URLSearchParams(window.location.search);
  const context = params.get("context") as "app" | "action";
  const searchText = params.get("search") ?? "";
  return new DictionaryPage({
    target: document.body,
    props: { initialized, platform, context, searchText },
  });
}

exposeGlobals({
  platform,
  Utils,
  config() {
    void lazyConfig.get();
    return lazyConfig.getIfInitialized()
  },
  backend
})