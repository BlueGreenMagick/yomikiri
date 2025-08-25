import { Config } from "@/features/config";
import type { IosCtx } from "@/features/ctx";
import { LazyAsync } from "@/features/utils";
import { IosAnkiApi } from "../anki";
import { IosBackend } from "../backend";
import { IosMessaging } from "../messaging";
import { IosPlatform } from "../platform";
import { IosAnkiApiPage } from "./anki";
import { IosPlatformPage } from "./platform";

export function createIosPageCtx(): IosCtx {
  const messaging = IosMessaging.page();
  const platformPage = new IosPlatformPage(messaging);
  const platform = IosPlatform.page(platformPage);
  const lazyConfig = new LazyAsync(() => Config.initialize(platform));
  const ankiPage = new IosAnkiApiPage(lazyConfig);
  const anki = IosAnkiApi.page(ankiPage);
  const backend = new IosBackend(messaging);

  return {
    platformType: "ios",
    platform,
    lazyConfig,
    anki,
    backend,
  };
}
