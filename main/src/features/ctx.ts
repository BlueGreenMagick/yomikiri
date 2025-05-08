import type Config from "./config";
import type {
  DesktopPlatform,
  IosAppPlatform,
  IosPlatform,
  Platform,
  AndroidPlatform,
} from "@/platform/types";
import type { Toast } from "./toast/toast";

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
export type AndroidCtx = PlatformCtx<AndroidPlatform>;

export type AnyPlatformCtx = DesktopCtx | IosCtx | IosAppCtx | AndroidCtx;

export interface ToastCtx {
  toast: Toast;
}

export type EmptyCtx = Record<never, never>;

export type AppCtx<T = EmptyCtx> = ConfigCtx & AnyPlatformCtx & ToastCtx & T;
