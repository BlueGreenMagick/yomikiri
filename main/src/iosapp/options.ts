import OptionsPage from "../components/options/OptionsPage.svelte";
import { Platform } from "platform/iosapp";
import { IosAppAnkiApi } from "platform/iosapp/anki";
import Utils, { exposeGlobals } from "lib/utils";
import Config from "lib/config";

const ankiApi = IosAppAnkiApi.instance.get();

const initialized = initialize();

async function initialize(): Promise<[IosAppAnkiApi]> {
  await Promise.resolve();
  return [ankiApi];
}

const page = new OptionsPage({
  target: document.body,
  props: { initialized },
});

exposeGlobals({
  Platform,
  Utils,
  ankiApi,
  config: Config.instance,
  page,
});
