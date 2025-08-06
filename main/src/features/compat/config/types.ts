import type { Configuration_V1 } from "./v1";
import type { Configuration_V2 } from "./v2";
import type { Configuration_V3 } from "./v3";

interface ConfigBase {
  config_version?: number | undefined;
  version?: string | undefined;
}

interface Configuration_New extends ConfigBase {
  config_version?: undefined;
  version?: undefined;
}

export type StoredConfig<C extends ConfigBase> =
  & Partial<C>
  & Pick<C, "config_version" | "version">;

interface Configurations {
  0: Configuration_New;
  1: Configuration_V1.Configuration;
  2: Configuration_V2.Configuration;
  3: Configuration_V3.Configuration;
}

export type CompatConfiguration = Configurations[keyof Configurations];
export type StoredCompatConfiguration = {
  [K in keyof Configurations]: StoredConfig<Configurations[K]>;
}[keyof Configurations];
