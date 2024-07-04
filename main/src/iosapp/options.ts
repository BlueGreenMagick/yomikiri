import OptionsPage from "../components/options/OptionsPage.svelte";
import { Platform } from "platform/iosapp";
import { IosAppAnkiApi } from "@platform/anki";
import Utils, { LazyAsync, exposeGlobals } from "lib/utils";
import Config from "lib/config";
import type { IosAppDictionary } from "platform/common/dictionary";

const lazyAnkiApi = new LazyAsync(async () =>
  Platform.newAnkiApi(await Config.instance.get()),
);
const dictionary = Platform.newDictionary();

const initialized = initialize();

async function initialize(): Promise<
  [Config, IosAppAnkiApi, IosAppDictionary]
> {
  const config = await Config.instance.get();
  config.setStyle(document);
  const ankiApi = await lazyAnkiApi.get();
  return [config, ankiApi, dictionary];
}

const page = new OptionsPage({
  target: document.body,
  props: { initialized },
});

exposeGlobals({
  Platform,
  Utils,
  ankiApi: lazyAnkiApi,
  config: Config.instance,
  page,
});
