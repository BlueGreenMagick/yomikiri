import OptionsPage from "@/components/options/OptionsPage.svelte";
import { Platform } from "@/platform/iosapp";
import Utils, { exposeGlobals } from "@/features/utils";
import Config from "@/features/config";
import { AnkiApi } from "@/platform/iosapp/anki";
import { Backend } from "@/platform/iosapp/backend";

const page = new OptionsPage({
  target: document.body,
  props: {},
});

exposeGlobals({
  Platform,
  Utils,
  AnkiApi,
  Backend,
  config: Config.instance,
  page,
});
