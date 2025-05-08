import Config from "@/features/config";
import { DesktopPlatform } from ".";
import { DesktopAnkiApi } from "./anki";
import type { DesktopCtx } from "@/features/ctx";
import { DesktopBackend } from "./backend";
import { LazyAsync } from "@/features/utils";

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
