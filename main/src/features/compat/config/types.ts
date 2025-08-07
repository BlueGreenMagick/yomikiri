import type * as V1 from "./v1";
import type * as V2 from "./v2";
import type * as V3 from "./v3";

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
  1: V1.Configuration;
  2: V2.Configuration;
  3: V3.Configuration;
}

export type CompatConfiguration = Configurations[keyof Configurations];
export type StoredCompatConfiguration = {
  [K in keyof Configurations]: StoredConfig<Configurations[K]>;
}[keyof Configurations];
