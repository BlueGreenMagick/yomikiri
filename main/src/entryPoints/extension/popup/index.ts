import { ExtensionPlatform as Platform } from "#platform";
import PopupPage from "./PopupPage.svelte";
import Config from "@/lib/config";
import Utils, { exposeGlobals } from "@/lib/utils";
import { Backend } from "#platform/backend";
import { AnkiApi } from "#platform/anki";

const page = new PopupPage({
  target: document.body,
  props: {},
});

exposeGlobals({
  Platform,
  Utils,
  Backend,
  config: Config.instance,
  AnkiApi,
  page,
});
