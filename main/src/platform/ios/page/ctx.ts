import { Config } from "@/features/config";
import type { IosCtx } from "@/features/ctx";
import { Store } from "@/features/store";
import { LazyAsync } from "@/features/utils";
import { IosAnkiApi } from "../anki";
import { IosBackend } from "../backend";
import { IosPlatform } from "../platform";
import { IosAnkiApiPage } from "./anki";
import { IosBackendPage } from "./backend";
import { IosMessagingPage } from "./messaging";
import { IosPlatformPage } from "./platform";

export function createIosPageCtx(): IosCtx {
  const messaging = new IosMessagingPage();
  const platformPage = new IosPlatformPage(messaging);
  const platform = IosPlatform.page(platformPage);
  const store = new Store(platform);
  const lazyConfig = new LazyAsync(() => Config.initialize(platform));
  const ankiPage = new IosAnkiApiPage(lazyConfig);
  const anki = IosAnkiApi.page(ankiPage);
  const backendPage = new IosBackendPage(messaging);
  const backend = IosBackend.page(backendPage);

  return {
    platformType: "ios",
    platform,
    store,
    lazyConfig,
    anki,
    backend,
  };
}
