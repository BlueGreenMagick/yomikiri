import { Config } from "@/features/config";
import type { IosAppCtx } from "@/features/ctx";
import { Store } from "@/features/store";
import { LazyAsync } from "@/features/utils";
import { IosAppPlatform } from ".";
import { IosAppAnkiApi } from "./anki";
import { IosAppBackend } from "./backend";

export function createIosAppCtx(): IosAppCtx {
  const platform = new IosAppPlatform();
  const store = new Store(platform);
  const lazyConfig = new LazyAsync(() => Config.initialize(platform));
  const anki = new IosAppAnkiApi();
  const backend = new IosAppBackend();
  return {
    platformType: "iosapp",
    platform,
    store,
    lazyConfig,
    anki,
    backend,
  };
}
