import { Backend } from "@platform/backend";
import DictionaryPage from "./DictionaryPage.svelte";
import Config from "lib/config";
import Utils, { exposeGlobals } from "lib/utils";
import { IosAppAnkiApi } from "platform/iosapp/anki";

const ankiApi = IosAppAnkiApi.instance.get();

const initialized = initialize();

createSvelte(initialized);

async function initialize(): Promise<[IosAppAnkiApi]> {
  await Promise.resolve();
  return [ankiApi];
}

function createSvelte(initialized: Promise<[IosAppAnkiApi]>): DictionaryPage {
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
  Backend,
  ankiApi,
});
