/* desktop only */

import OptionsPage from "@/components/options/OptionsPage.svelte";
import { Platform } from "@/platform/desktop";
import Utils, { exposeGlobals } from "@/features/utils";
import Config from "@/features/config";
import { AnkiApi } from "#platform/anki";

const page = new OptionsPage({
  target: document.body,
  props: {},
});

exposeGlobals({
  Platform,
  Utils,
  AnkiApi,
  config: Config.instance,
  page,
});
