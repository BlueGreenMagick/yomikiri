import type Config from "./config";
import type { Platform } from "#platform";

export interface ConfigContext {
  config: Config;
}

export interface PlatformContext {
  platform: typeof Platform;
}

type EmptyContext = Record<never, never>;

export type AppContext<T = EmptyContext> = ConfigContext & PlatformContext & T;
