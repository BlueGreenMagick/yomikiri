import { Config } from "@/features/config";
import type { IosAppCtx } from "@/features/ctx";
import { LazyAsync } from "@/features/utils";
import { IosAppPlatform } from ".";
import { IosAppAnkiApi } from "./anki";
import { IosAppBackend } from "./backend";

export function createIosAppCtx(): IosAppCtx {
  const platform = new IosAppPlatform();
  const lazyConfig = new LazyAsync(() => Config.initialize(platform));
  const anki = new IosAppAnkiApi();
  const backend = new IosAppBackend();
  return {
    platformType: "iosapp",
    platform,
    lazyConfig,
    anki,
    backend,
  };
}
