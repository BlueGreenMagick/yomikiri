import { Config } from "@/features/config";
import type { DesktopCtx } from "@/features/ctx";
import { LazyAsync } from "@/features/utils";
import { DesktopAnkiApi } from "../anki";
import { DesktopBackend } from "../backend";
import { DesktopPlatform } from "../platform";
import { DesktopAnkiApiPage } from "./anki";
import { DesktopPlatformPage } from "./platform";

/** Must be executed synchronously on page load */
export function createPageDesktopCtx(): DesktopCtx {
  const platformPage = new DesktopPlatformPage();
  const platform = DesktopPlatform.page(platformPage);
  const backend = DesktopBackend.foreground();
  const lazyConfig = new LazyAsync(() => Config.initialize(platform));
  const ankiApiPage = new DesktopAnkiApiPage(lazyConfig);
  const anki = DesktopAnkiApi.page(lazyConfig, ankiApiPage);

  return {
    platformType: "desktop",
    platform,
    lazyConfig,
    backend,
    anki,
  };
}
