import DictionaryPage from "./DictionaryPage.svelte";
import Config from "lib/config";
import Utils, { exposeGlobals } from "lib/utils";
import { IosAppBackend } from "platform/iosapp/backend";
import { IosAppAnkiApi } from "platform/iosapp/anki";

const backend = IosAppBackend.instance.get();
const ankiApi = IosAppAnkiApi.instance.get();

const initialized = initialize();

createSvelte(initialized);

async function initialize(): Promise<[Config, IosAppBackend, IosAppAnkiApi]> {
  const config = await Config.instance.get();
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
  config: Config.instance,
  backend,
  ankiApi,
});
