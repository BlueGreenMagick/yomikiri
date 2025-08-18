import { migrateV1 } from "./migrateV1";
import type { StoredConfigurationV1 } from "./types/typesV1";
import type { StoredConfigurationV2 } from "./types/typesV2";

export type { StoredConfigurationV1 } from "./types/typesV1";

export function migrateConfigObject(config: StoredConfigurationV1): StoredConfigurationV2 {
  const result = migrateV1({ config });
  return result.config;
}
