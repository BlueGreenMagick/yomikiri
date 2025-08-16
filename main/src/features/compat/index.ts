import { VERSION } from "@/consts";
import type { AnyPlatformCtx } from "../ctx";
import { migrateV1, type StoredConfigV0 } from "./v1";

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

export async function migrate(ctx: AnyPlatformCtx, version: number) {
  if (version === 0) {
    const storedConfig = await ctx.platform.getStore("web.config.v0") as StoredConfigV0 | null;
    const config = storedConfig ?? {};
    const result = migrateV1({ config, currentVersion: VERSION });
    await ctx.store.set("web.config.v3", result.config);
  }
}
