import { Config } from "@/features/config";
import type { DesktopCtx } from "@/features/ctx";
import { Store } from "@/features/store";
import { LazyAsync } from "@/features/utils";
import { DesktopBackend, DesktopPlatform } from ".";
import { DesktopAnkiApi } from "./anki";
import { DesktopBackendBackground } from "./backend";
import { Database } from "./db";
import { DesktopPlatformBackground } from "./platform";

/** Must be executed synchronously on page load */
export function createForegroundDesktopCtx(): DesktopCtx {
  const platform = DesktopPlatform.foreground();
  const backend = DesktopBackend.foreground();
  const store = new Store(platform);
  const lazyConfig = new LazyAsync(() => Config.initialize(platform));
  const anki = new DesktopAnkiApi(lazyConfig);

  return {
    platformType: "desktop",
    platform,
    store,
    lazyConfig,
    backend,
    anki,
  };
}

export function createBackgroundDesktopCtx(): DesktopCtx {
  const db = new LazyAsync(() => Database.init());
  const platformBackground = new DesktopPlatformBackground(db);
  const platform = DesktopPlatform.background(platformBackground);
  const backendBackground = new DesktopBackendBackground(db);
  const backend = DesktopBackend.background(backendBackground);
  const store = new Store(platform);
  const lazyConfig = new LazyAsync(() => Config.initialize(platform));
  const anki = new DesktopAnkiApi(lazyConfig);

  return {
    platformType: "desktop",
    platform,
    store,
    lazyConfig,
    backend,
    anki,
  };
}
