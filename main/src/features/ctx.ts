import type { AndroidAnkiApi, AndroidBackend, AndroidPlatform } from "@/platform/android";
import type { DesktopAnkiApi, DesktopBackend, DesktopPlatform } from "@/platform/desktop";
import type { IosAnkiApi, IosBackend, IosPlatform } from "@/platform/ios";
import type { IosAppAnkiApi, IosAppBackend, IosAppPlatform } from "@/platform/iosapp";
import type { Config } from "./config";
import type { Toast } from "./toast/toast";
import type { LazyAsync } from "./utils";

export interface LazyConfigCtx {
  lazyConfig: LazyAsync<Config>;
}

type BasePlatformCtx = LazyConfigCtx;

export interface DesktopCtx extends BasePlatformCtx {
  platformType: "desktop";
  platform: DesktopPlatform;
  anki: DesktopAnkiApi;
  backend: DesktopBackend;
}

export interface IosCtx extends BasePlatformCtx {
  platformType: "ios";
  platform: IosPlatform;
  anki: IosAnkiApi;
  backend: IosBackend;
}

export interface IosAppCtx extends BasePlatformCtx {
  platformType: "iosapp";
  platform: IosAppPlatform;
  anki: IosAppAnkiApi;
  backend: IosAppBackend;
}

export interface AndroidCtx extends BasePlatformCtx {
  platformType: "android";
  platform: AndroidPlatform;
  anki: AndroidAnkiApi;
  backend: AndroidBackend;
}

export type AnyPlatformCtx = DesktopCtx | IosCtx | IosAppCtx | AndroidCtx;

export interface ConfigCtx {
  config: Config;
}

export interface ToastCtx {
  toast: Toast;
}

export type EmptyCtx = Record<never, never>;

export type AppCtx<T = EmptyCtx> = ConfigCtx & AnyPlatformCtx & ToastCtx & T;
