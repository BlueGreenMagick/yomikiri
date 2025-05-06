import type Config from "./config";
import type { Platform } from "#platform";

export interface ConfigCtx {
  config: Config;
}

export interface PlatformCtx {
  platform: typeof Platform;
}

type EmptyCtx = Record<never, never>;

export type AppCtx<T = EmptyCtx> = ConfigCtx & T;
