import { VERSION } from "@/consts";
import type { ConfigurationV3 } from "../types/typesV3";
import * as ConfigV2 from "./configv2";
import * as ConfigV3 from "./configv3";
import type { StoredCompatConfiguration, StoredConfig } from "./types";

export type StoredConfigV0 = StoredCompatConfiguration;
export type StoredConfigV3 = StoredConfig<ConfigurationV3>;

export interface Props {
  config: StoredConfigV0;
}

export interface MigrateV1Result {
  config: StoredConfigV3;
}

export function migrateV1({ config }: Props): MigrateV1Result {
  if (
    config.config_version !== undefined &&
    config.config_version > 3
  ) {
    throw new Error(
      `Expected config_version to be less than 3, but received: ${config.config_version}`,
    );
  } else if (config.config_version === 3) {
    return { config };
  } else if (
    config.config_version === undefined &&
    config.version === undefined
  ) {
    const config = {
      config_version: 3,
      version: VERSION,
    } as const;
    return { config };
  }

  if (config.config_version === undefined) {
    console.debug(`Migrating config object from v1 to v2`);
    config = ConfigV2.migrateConfiguration_1(config);
  }
  if (config.config_version === 2) {
    console.debug(`Migrating config object from v2 to v3`);
    config = ConfigV3.migrateConfiguration_2(config);
  }

  return { config };
}
