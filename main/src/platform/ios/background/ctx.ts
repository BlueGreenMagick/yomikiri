import { Config } from "@/features/config";
import type { IosCtx } from "@/features/ctx";
import { LazyAsync } from "@/features/utils";
import { IosAnkiApi } from "../anki";
import { IosBackend } from "../backend";
import { IosMessaging } from "../messaging";
import { IosAnkiApiPage } from "../page/anki";
import { IosPlatformPage } from "../page/platform";
import { IosPlatform } from "../platform";

export function createIosBackgroundCtx(): IosCtx {
  const messaging = IosMessaging.background();
  const platformPage = new IosPlatformPage(messaging);
  const platform = IosPlatform.background(platformPage);
  const lazyConfig = new LazyAsync(() => Config.initialize(platform));
  const ankiPage = new IosAnkiApiPage(lazyConfig);
  const anki = IosAnkiApi.background(ankiPage);
  const backend = new IosBackend(messaging);

  return {
    platformType: "ios",
    platform,
    lazyConfig,
    anki,
    backend,
  };
}
