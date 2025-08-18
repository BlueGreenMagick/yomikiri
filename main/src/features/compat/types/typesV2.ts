import type { Configuration } from "@/features/config";

interface ConfigBase {
  config_version?: number | undefined;
  version?: string | undefined;
}

type StoredConfig<C extends ConfigBase> =
  & Partial<C>
  & Pick<C, "config_version" | "version">;

export type StoredConfigurationV2 = StoredConfig<Configuration>;
