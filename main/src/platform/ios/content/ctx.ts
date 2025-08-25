import { Config } from "@/features/config";
import type { IosCtx } from "@/features/ctx";
import { LazyAsync } from "@/features/utils";
import { IosAnkiApi } from "../anki";
import { IosBackend } from "../backend";
import { IosMessaging } from "../messaging";
import { IosPlatform } from "../platform";

/** Must be executed synchronously on page load */
export function createIosContentCtx(): IosCtx {
  const messaging = IosMessaging.content();
  const platform = IosPlatform.content();
  const lazyConfig = new LazyAsync(() => Config.initialize(platform));
  const anki = IosAnkiApi.content();
  const backend = new IosBackend(messaging);

  return {
    platformType: "ios",
    platform,
    lazyConfig,
    anki,
    backend,
  };
}
