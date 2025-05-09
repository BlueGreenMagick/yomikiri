import { AndroidPlatform } from ".";
import type { AndroidCtx } from "@/features/ctx";
import { AndroidBackend } from "./backend";
import { AndroidAnkiApi } from "./anki";
import { LazyAsync } from "@/features/utils";
import { Config } from "@/features/config";

export function createAndroidCtx(): AndroidCtx {
  const platform = new AndroidPlatform();
  const lazyConfig = new LazyAsync(() => Config.initialize(platform));
  const backend = new AndroidBackend();
  const anki = new AndroidAnkiApi();

  return {
    platformType: "android",
    platform,
    lazyConfig,
    backend,
    anki,
  };
}
