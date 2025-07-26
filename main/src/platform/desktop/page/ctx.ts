import { Config } from "@/features/config";
import type { DesktopCtx } from "@/features/ctx";
import { Store } from "@/features/store";
import { LazyAsync } from "@/features/utils";
import { DesktopAnkiApi } from "../anki";
import { DesktopBackend } from "../backend";
import { DesktopPlatform } from "../platform";
import { DesktopAnkiApiPage } from "./anki";

/** Must be executed synchronously on page load */
export function createPageDesktopCtx(): DesktopCtx {
  const platform = DesktopPlatform.foreground();
  const backend = DesktopBackend.foreground();
  const store = new Store(platform);
  const lazyConfig = new LazyAsync(() => Config.initialize(platform));
  const ankiApiPage = new DesktopAnkiApiPage(lazyConfig);
  const anki = DesktopAnkiApi.page(lazyConfig, ankiApiPage);

  return {
    platformType: "desktop",
    platform,
    store,
    lazyConfig,
    backend,
    anki,
  };
}
