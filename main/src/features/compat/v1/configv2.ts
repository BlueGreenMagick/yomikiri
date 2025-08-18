import type { ConfigurationV1 } from "../types/typesV1";
import type { ConfigurationV2 } from "../types/typesV2";
import type { StoredConfig } from "./types";

export function migrateConfiguration_1(
  config: StoredConfig<ConfigurationV1>,
): StoredConfig<ConfigurationV2> {
  return {
    ...config,
    config_version: 2,
  };
}
