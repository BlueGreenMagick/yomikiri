import { Config } from "@/features/config";
import type { DesktopCtxWithoutBackend } from "@/features/ctx";
import { LazyAsync } from "@/features/utils";
import { DesktopPlatform } from ".";
import { DesktopAnkiApi } from "./anki";

export function createDesktopCtxWithoutBackend(): DesktopCtxWithoutBackend {
  const platform = new DesktopPlatform();
  const lazyConfig = new LazyAsync(() => Config.initialize(platform));
  const anki = new DesktopAnkiApi(lazyConfig);

  return {
    platformType: "desktop",
    platform,
    lazyConfig,
    anki,
  };
}
