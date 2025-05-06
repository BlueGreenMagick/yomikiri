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

export interface PlatformCtx<P = typeof Platform> {
  platform: P;
}

export type DesktopCtx = PlatformCtx<DesktopPlatform>;
export type IosCtx = PlatformCtx<IosPlatform>;
export type IosAppCtx = PlatformCtx<IosAppPlatform>;

export type EmptyCtx = Record<never, never>;

export type AppCtx<T = EmptyCtx> = ConfigCtx & PlatformCtx & T;
