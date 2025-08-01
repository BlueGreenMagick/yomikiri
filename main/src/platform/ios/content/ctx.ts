import { Config } from "@/features/config";
import type { IosCtx } from "@/features/ctx";
import { Store } from "@/features/store";
import { LazyAsync } from "@/features/utils";
import { IosAnkiApi } from "../anki";
import { IosBackend } from "../backend";
import { IosPlatform } from "../platform";

/** Must be executed synchronously on page load */
export function createIosContentCtx(): IosCtx {
  const platform = IosPlatform.content();
  const store = new Store(platform);
  const lazyConfig = new LazyAsync(() => Config.initialize(platform));
  const anki = IosAnkiApi.content();
  const backend = IosBackend.content();

  return {
    platformType: "ios",
    platform,
    store,
    lazyConfig,
    anki,
    backend,
  };
}
