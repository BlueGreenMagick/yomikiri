import { Config } from "@/features/config";
import type { AndroidCtx } from "@/features/ctx";
import { Store } from "@/features/store";
import { LazyAsync } from "@/features/utils";
import { AndroidPlatform } from ".";
import { AndroidAnkiApi } from "./anki";
import { AndroidBackend } from "./backend";

export function createAndroidCtx(): AndroidCtx {
  const platform = new AndroidPlatform();
  const store = new Store(platform);
  const lazyConfig = new LazyAsync(() => Config.initialize(platform));
  const backend = new AndroidBackend();
  const anki = new AndroidAnkiApi();

  return {
    platformType: "android",
    platform,
    store,
    lazyConfig,
    backend,
    anki,
  };
}
