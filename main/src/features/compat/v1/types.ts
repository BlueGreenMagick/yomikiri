import type * as ConfigV1 from "./configv1";
import type * as ConfigV2 from "./configv2";
import type * as ConfigV3 from "./configv3";

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
  1: ConfigV1.Configuration;
  2: ConfigV2.Configuration;
  3: ConfigV3.Configuration;
}

export type CompatConfiguration = Configurations[keyof Configurations];
export type StoredCompatConfiguration = {
  [K in keyof Configurations]: StoredConfig<Configurations[K]>;
}[keyof Configurations];
