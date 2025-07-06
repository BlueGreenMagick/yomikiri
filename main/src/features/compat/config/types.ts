import { type Configuration } from "@/features/config";
import type { Configuration_1 } from "./v1";
import type { Configuration_2 } from "./v2";

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
  1: Configuration_1;
  2: Configuration_2;
  3: Configuration;
}

export type CompatConfiguration = Configurations[keyof Configurations];
export type StoredCompatConfiguration = {
  [K in keyof Configurations]: StoredConfig<Configurations[K]>;
}[keyof Configurations];
