/* desktop only */

import OptionsPage from "components/options/OptionsPage.svelte";
import { Platform } from "platform/desktop";
import Utils, { exposeGlobals } from "lib/utils";
import Config from "lib/config";
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
