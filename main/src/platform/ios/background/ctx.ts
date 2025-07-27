import { Config } from "@/features/config";
import type { IosCtx } from "@/features/ctx";
import { Store } from "@/features/store";
import { LazyAsync } from "@/features/utils";
import { IosAnkiApi } from "../anki";
import { IosBackend } from "../backend";
import { IosAnkiApiPage } from "../page/anki";
import { IosBackendPage } from "../page/backend";
import { IosMessagingPage } from "../page/messaging";
import { IosPlatformPage } from "../page/platform";
import { IosPlatform } from "../platform";

export function createIosBackgroundCtx(): IosCtx {
  const messaging = new IosMessagingPage();
  const platformPage = new IosPlatformPage(messaging);
  const platform = IosPlatform.background(platformPage);
  const store = new Store(platform);
  const lazyConfig = new LazyAsync(() => Config.initialize(platform));
  const ankiPage = new IosAnkiApiPage(lazyConfig);
  const anki = IosAnkiApi.background(ankiPage);
  const backendPage = new IosBackendPage(messaging);
  const backend = IosBackend.background(backendPage);

  return {
    platformType: "ios",
    platform,
    store,
    lazyConfig,
    anki,
    backend,
  };
}
