import DictionaryPage from "./DictionaryPage.svelte";
import Config from "lib/config";
import Utils, { LazyAsync, exposeGlobals } from "lib/utils";
import { Platform } from "platform/iosapp";
import { IosAppBackend } from "platform/iosapp/backend";
import type { IosAppAnkiApi } from "platform/iosapp/anki";

const lazyConfig = new LazyAsync(() => Config.initialize());
const backend = IosAppBackend.instance.get();
const ankiApi = Platform.newAnkiApi();

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
    props: { initialized, context, searchText },
  });
}

exposeGlobals({
  Utils,
  config() {
    void lazyConfig.get();
    return lazyConfig.getIfInitialized();
  },
  backend,
  ankiApi,
});
