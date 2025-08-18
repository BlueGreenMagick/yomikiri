import type { ConfigurationV1 } from "../types/typesV1";
import type { ConfigurationV2 } from "../types/typesV2";
import type { ConfigurationV3 } from "../types/typesV3";

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
  1: ConfigurationV1;
  2: ConfigurationV2;
  3: ConfigurationV3;
}

export type CompatConfiguration = Configurations[keyof Configurations];
export type StoredCompatConfiguration = {
  [K in keyof Configurations]: StoredConfig<Configurations[K]>;
}[keyof Configurations];
