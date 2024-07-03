import { Platform, type ExtensionPlatform } from "@platform";
import PopupPage from "./PopupPage.svelte";
import Config from "lib/config";
import Utils, {
  LazyAsync,
  exposeGlobals,
  type PromiseOrValue,
} from "lib/utils";
import type { Backend, DesktopBackend, IosBackend } from "@platform/backend";
import type { AnkiApi } from "@platform/anki";

const platform = new Platform() as ExtensionPlatform;
const lazyConfig = new LazyAsync(() => Config.initialize(platform));
const lazyBackend = new LazyAsync(
  (): PromiseOrValue<DesktopBackend | IosBackend> => platform.newBackend(),
);
const lazyAnkiApi = new LazyAsync<AnkiApi>(async () =>
  platform.newAnkiApi(await lazyConfig.get()),
);

const initialized = initialize();

async function initialize(): Promise<[Config, Backend, AnkiApi]> {
  const config = await lazyConfig.get();
  config.setStyle(document);
  const backend = await lazyBackend.get();
  const ankiApi = await lazyAnkiApi.get();
  return [config, backend, ankiApi];
}

const page = new PopupPage({
  target: document.body,
  props: { platform, initialized },
});

exposeGlobals({
  platform,
  Utils,
  backend: () => {
    void lazyBackend.get();
    return lazyBackend.getIfInitialized();
  },
  config: () => {
    void lazyConfig.get();
    return lazyConfig.getIfInitialized();
  },
  page,
});
