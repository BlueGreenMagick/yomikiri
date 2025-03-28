import { Platform } from "@/platform/iosapp";
import { IosAppAnkiApi } from "@/platform/iosapp/anki";
import Utils, { exposeGlobals } from "@/lib/utils";
import Config from "@/lib/config";
import OptionsAnkiTemplatePage from "./OptionsAnkiTemplatePage.svelte";

const page = new OptionsAnkiTemplatePage({
  target: document.body,
  props: {},
});

exposeGlobals({
  Platform,
  config: Config.instance,
  page,
  AnkiApi: IosAppAnkiApi,
  Utils,
});
