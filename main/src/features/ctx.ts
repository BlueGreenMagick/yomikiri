import type Config from "./config";
import type {
  DesktopPlatform,
  IosAppPlatform,
  IosPlatform,
  Platform,
} from "#platform";

export interface ConfigCtx {
  config: Config;
}

type PlatformCtx<P extends typeof Platform> = {
  platform: P;
  platformType: P["type"];
};

export type DesktopCtx = PlatformCtx<DesktopPlatform>;
export type IosCtx = PlatformCtx<IosPlatform>;
export type IosAppCtx = PlatformCtx<IosAppPlatform>;

export type AnyPlatformCtx = DesktopCtx | IosCtx | IosAppCtx;

export type EmptyCtx = Record<never, never>;

export type AppCtx<T = EmptyCtx> = ConfigCtx & AnyPlatformCtx & T;
