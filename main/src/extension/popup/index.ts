import { ExtensionPlatform as Platform } from "@platform";
import PopupPage from "./PopupPage.svelte";
import Config from "lib/config";
import Utils, { LazyAsync, exposeGlobals } from "lib/utils";
import { Backend } from "@platform/backend";
import type { AnkiApi } from "@platform/anki";

const lazyAnkiApi = new LazyAsync<AnkiApi>(async () =>
  Platform.newAnkiApi(await Config.instance.get()),
);

const initialized = initialize();

async function initialize(): Promise<[Config, Backend, AnkiApi]> {
  const config = await Config.instance.get();
  config.setStyle(document);
  const backend = await Backend.instance.get();
  const ankiApi = await lazyAnkiApi.get();
  return [config, backend, ankiApi];
}

const page = new PopupPage({
  target: document.body,
  props: { initialized },
});

exposeGlobals({
  Platform,
  Utils,
  backend: () => {
    void Backend.instance.get();
    return Backend.instance.getIfInitialized();
  },
  config: () => {
    void Config.instance.get();
    return Config.instance.getIfInitialized();
  },
  page,
});
