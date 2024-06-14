import DictionaryPage from "./DictionaryPage.svelte";
import Config from "lib/config";
import Utils, { LazyAsync, exposeGlobals } from "lib/utils";
import { Platform } from "platform/iosapp";
import type { IosAppBackend } from "platform/iosapp/backend";
import type { IosAppAnkiApi } from "platform/iosapp/anki";

const platform = new Platform();
const lazyConfig = new LazyAsync(() => Config.initialize(platform));
const backend = platform.newBackend();
const ankiApi = platform.newAnkiApi();

const initialized = initialize();

createSvelte(initialized);

async function initialize(): Promise<[Config, IosAppBackend, IosAppAnkiApi]> {
  const config = await lazyConfig.get();
  config.setStyle(document);

  return [config, backend, ankiApi];
}

function createSvelte(
  initialized: Promise<[Config, IosAppBackend, IosAppAnkiApi]>,
): DictionaryPage {
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
    return lazyConfig.getIfInitialized();
  },
  backend,
  ankiApi,
});
