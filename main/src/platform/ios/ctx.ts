import type { IosCtx } from "@/features/ctx";
import { IosPlatform } from "./platform";
import { IosBackend } from "./backend";
import { IosAnkiApi } from "./anki";
import { Config } from "@/features/config";
import { LazyAsync } from "@/features/utils";

export function createIosCtx(): IosCtx {
  const platform = new IosPlatform();
  const lazyConfig = new LazyAsync(() => Config.initialize(platform));
  const anki = new IosAnkiApi(lazyConfig);
  const backend = new IosBackend();

  return {
    platformType: "ios",
    platform,
    lazyConfig,
    anki,
    backend,
  };
}
