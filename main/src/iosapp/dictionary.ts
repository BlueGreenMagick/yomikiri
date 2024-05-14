import DictionaryPage from "./DictionaryPage.svelte";
import Config from "~/lib/config";
import Utils, { LazyAsync, exposeGlobals } from "~/lib/utils";
import { Platform } from "~/platform/iosapp";
import { updateTTSAvailability } from "~/common";
import type { IosAppBackend } from "~/platform/iosapp/backend";
import type { IosAppAnkiApi } from "~/platform/iosapp/anki";

const platform = new Platform()
const initialized = initialize();
const lazyConfig = new LazyAsync(() => Config.initialize(platform))
const backend = platform.newBackend()
const lazyAnkiApi = new LazyAsync(async () => platform.newAnkiApi(await lazyConfig.get()))

createSvelte(initialized);

async function initialize(): Promise<[Config, IosAppBackend, IosAppAnkiApi]> {
  const config = await lazyConfig.get()
  config.setStyle(document);

  const ankiApi = await lazyAnkiApi.get()

  // queue task to run later
  setTimeout(() => { void deferredInitialize(config) }, 0);
  return [config, backend, ankiApi]
}

/** Non-essential code to run at startup but not immediately */
async function deferredInitialize(config: Config): Promise<void> {
  await updateTTSAvailability(platform, config);
}

function createSvelte(initialized: Promise<[Config, IosAppBackend, IosAppAnkiApi]>): DictionaryPage {
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