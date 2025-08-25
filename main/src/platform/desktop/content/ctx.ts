import { Config } from "@/features/config";
import type { DesktopCtx } from "@/features/ctx";
import { LazyAsync } from "@/features/utils";
import { DesktopAnkiApi } from "../anki";
import { DesktopBackend } from "../backend";
import { DesktopPlatform } from "../platform";

/** Must be executed synchronously on page load */
export function createContentDesktopCtx(): DesktopCtx {
  const platform = DesktopPlatform.content();
  const backend = DesktopBackend.foreground();
  const lazyConfig = new LazyAsync(() => Config.initialize(platform));
  const anki = DesktopAnkiApi.content(lazyConfig);

  return {
    platformType: "desktop",
    platform,
    lazyConfig,
    backend,
    anki,
  };
}
