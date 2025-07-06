import { Config } from "@/features/config";
import type { IosCtx } from "@/features/ctx";
import { Store } from "@/features/store";
import { LazyAsync } from "@/features/utils";
import { IosAnkiApi } from "./anki";
import { IosBackend } from "./backend";
import { IosPlatform } from "./platform";

export function createIosCtx(): IosCtx {
  const platform = new IosPlatform();
  const store = new Store(platform);
  const lazyConfig = new LazyAsync(() => Config.initialize(platform));
  const anki = new IosAnkiApi(lazyConfig);
  const backend = new IosBackend();

  return {
    platformType: "ios",
    platform,
    store,
    lazyConfig,
    anki,
    backend,
  };
}
