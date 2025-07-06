import { CONFIG_VERSION, type StoredConfiguration } from "@/features/config";
import { VERSION } from "consts";
import {
  migrateConfiguration_1,
  migrateConfiguration_2,
  type StoredCompatConfiguration,
} from "./config";

/**
 * Don't call this function directly. Instead, call `migrateIfNeeded()`.
 *
 * This function is called by `platform.migrateConfig()`
 */
export function migrateConfigObject(
  config: StoredCompatConfiguration,
): StoredConfiguration {
  if (
    config.config_version !== undefined &&
    config.config_version > CONFIG_VERSION
  ) {
    // if config was created in future version,
    // try using as-is as it's mostly backwards-compatible
    console.error(
      `Encountered future config_version '${config.config_version}'. Current CONFIG_VERSION is '${CONFIG_VERSION}'. Using config as-is. Unexpected error may occur.`,
    );
    return config as StoredConfiguration;
  } else if (config.config_version === CONFIG_VERSION) {
    return config;
  } else if (
    config.config_version === undefined &&
    config.version === undefined
  ) {
    return {
      config_version: CONFIG_VERSION,
      version: VERSION,
    };
  }

  if (config.config_version === undefined) {
    console.debug(`Migrating config object from v1 to v2`);
    config = migrateConfiguration_1(config);
  }
  if (config.config_version === 2) {
    console.debug(`Migrating config object from v2 to v3`);
    config = migrateConfiguration_2(config);
  }

  return config;
}
