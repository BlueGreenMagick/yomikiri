/* desktop only */

import OptionsPage from "../../components/options/OptionsPage.svelte";
import { Platform } from "platform/desktop";
import { DesktopAnkiApi } from "platform/desktop/anki";
import Utils, { exposeGlobals } from "lib/utils";
import Config from "lib/config";

async function initialize(): Promise<[Config, DesktopAnkiApi]> {
  const config = await Config.instance.get();
  config.setStyle(document);
  const ankiApi = await DesktopAnkiApi.instance.get();
  return [config, ankiApi];
}

const initialized = initialize();

const page = new OptionsPage({
  target: document.body,
  props: { initialized },
});

exposeGlobals({
  Platform,
  Utils,
  ankiApi: DesktopAnkiApi.instance,
  config: Config.instance,
  page,
});
