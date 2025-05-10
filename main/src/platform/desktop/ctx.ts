import { Config } from "@/features/config";
import type { DesktopCtx } from "@/features/ctx";
import { LazyAsync } from "@/features/utils";
import { DesktopPlatform } from ".";
import { DesktopAnkiApi } from "./anki";
import { DesktopBackend } from "./backend";

export function createDesktopCtx(): DesktopCtx {
  const platform = new DesktopPlatform();
  const lazyConfig = new LazyAsync(() => Config.initialize(platform));
  const anki = new DesktopAnkiApi(lazyConfig);
  const backend = new DesktopBackend();

  return {
    platformType: "desktop",
    platform,
    lazyConfig,
    anki,
    backend,
  };
}
