/* desktop only */

import OptionsPage from "../../components/options/OptionsPage.svelte";
import { Platform } from "platform/desktop";
import { DesktopAnkiApi } from "platform/desktop/anki";
import Utils, { exposeGlobals } from "lib/utils";
import Config from "lib/config";
import type { DesktopDictionary } from "platform/common/dictionary";

const lazyAnkiApi = new Utils.LazyAsync(async () =>
  Platform.newAnkiApi(await Config.instance.get()),
);
const lazyDictionary = new Utils.LazyAsync(() => Platform.newDictionary());

async function initialize(): Promise<
  [Config, DesktopAnkiApi, DesktopDictionary]
> {
  const config = await Config.instance.get();
  config.setStyle(document);
  const ankiApi = await lazyAnkiApi.get();
  const dict = await lazyDictionary.get();
  return [config, ankiApi, dict];
}

const initialized = initialize();

const page = new OptionsPage({
  target: document.body,
  props: { initialized },
});

exposeGlobals({
  Platform,
  Utils,
  ankiApi: lazyAnkiApi,
  config: Config.instance,
  dictionary: lazyDictionary,
  page,
});
