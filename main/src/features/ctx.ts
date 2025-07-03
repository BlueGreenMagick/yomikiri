import type { AndroidAnkiApi, AndroidBackend, AndroidPlatform } from "@/platform/android";
import type { DesktopAnkiApi, DesktopPlatform } from "@/platform/desktop";
import type {
  BackgroundDesktopBackend,
  ForegroundDesktopBackend,
} from "@/platform/desktop/backend";
import type { IosAnkiApi, IosBackend, IosPlatform } from "@/platform/ios";
import type { IosAppAnkiApi, IosAppBackend, IosAppPlatform } from "@/platform/iosapp";
import type { Config } from "./config";
import type { Toast } from "./toast/toast";
import type { LazyAsync } from "./utils";

export interface LazyConfigCtx {
  lazyConfig: LazyAsync<Config>;
}

type BasePlatformCtx = LazyConfigCtx;

export interface DesktopCtxWithoutBackend extends BasePlatformCtx {
  platformType: "desktop";
  platform: DesktopPlatform;
  anki: DesktopAnkiApi;
}

export interface ForegroundDesktopCtx extends DesktopCtxWithoutBackend {
  backend: ForegroundDesktopBackend;
}

export interface BackgroundDesktopCtx extends DesktopCtxWithoutBackend {
  backend: BackgroundDesktopBackend;
}

export type DesktopCtx = ForegroundDesktopCtx | BackgroundDesktopCtx;

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
