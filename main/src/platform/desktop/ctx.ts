import { Config } from "@/features/config";
import type { DesktopCtx } from "@/features/ctx";
import { LazyAsync } from "@/features/utils";
import { DesktopBackend, DesktopPlatform } from ".";
import { DesktopAnkiApi } from "./anki";
import { DesktopBackendBackground } from "./backend";
import { Database } from "./db";

export function createForegroundDesktopCtx(): DesktopCtx {
  const platform = new DesktopPlatform();
  const backend = DesktopBackend.foreground();
  const lazyConfig = new LazyAsync(() => Config.initialize(platform));
  const anki = new DesktopAnkiApi(lazyConfig);

  return {
    platformType: "desktop",
    platform,
    lazyConfig,
    backend,
    anki,
  };
}

export function createBackgroundDesktopCtx(): DesktopCtx {
  const platform = new DesktopPlatform();
  const db = new LazyAsync(() => Database.init());
  const backendBackground = new DesktopBackendBackground(db);
  const backend = DesktopBackend.background(backendBackground);
  const lazyConfig = new LazyAsync(() => Config.initialize(platform));
  const anki = new DesktopAnkiApi(lazyConfig);

  return {
    platformType: "desktop",
    platform,
    lazyConfig,
    backend,
    anki,
  };
}
