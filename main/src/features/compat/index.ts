/*
Migrate config objects created in previous versions.

The migration is initiated by `Platform`.
In extension, the migration runs only once in background context.
In iosapp, migration may run multiple times in each page,
but it is commited only once.

When `Configuration` structure is modified, `config_version` is incremented.

Configurations are backwards-compatible to best efforts.
Existing keys are not re-used for different meaning, or deleted.
Instead, a new key is always created.
And if needed, value is transformed and moved from existing key.
*/
export type { CompatConfiguration, StoredCompatConfiguration, StoredConfig } from "./config";
export { migrateConfigObject } from "./migrate";
