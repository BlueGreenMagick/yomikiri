import { Config } from "@/features/config";
import type { DesktopCtx } from "@/features/ctx";
import { LazyAsync } from "@/features/utils";
import { DesktopAnkiApi } from "../anki";
import { DesktopBackend } from "../backend";
import { DesktopAnkiApiPage } from "../page/anki";
import { DesktopPlatformPage } from "../page/platform";
import { DesktopPlatform } from "../platform";
import { DesktopBackendBackground } from "./backend";
import { Database } from "./db";
import { DesktopPlatformBackground } from "./platform";

export function createBackgroundDesktopCtx(): DesktopCtx {
  const db = new LazyAsync(() => Database.init());
  const platformPage = new DesktopPlatformPage();
  const platformBackground = new DesktopPlatformBackground(db);
  const platform = DesktopPlatform.background(platformPage, platformBackground);
  const backendBackground = new DesktopBackendBackground(db);
  const backend = DesktopBackend.background(backendBackground);
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
