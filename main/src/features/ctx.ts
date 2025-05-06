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
};

export type DesktopCtx = PlatformCtx<DesktopPlatform>;
export type IosCtx = PlatformCtx<IosPlatform>;
export type IosAppCtx = PlatformCtx<IosAppPlatform>;

export type AnyPlatformCtx = DesktopCtx | IosCtx | IosAppCtx;

export type EmptyCtx = Record<never, never>;

export type AppCtx<T = EmptyCtx> = ConfigCtx & AnyPlatformCtx & T;

export function isDesktopCtx(ctx: AnyPlatformCtx): ctx is DesktopCtx {
  return ctx.platform.type === "desktop";
}

export function isIosCtx(ctx: AnyPlatformCtx): ctx is IosCtx {
  return ctx.platform.type === "ios";
}

export function isIosAppCtx(ctx: AnyPlatformCtx): ctx is IosAppCtx {
  return ctx.platform.type === "iosapp";
}
