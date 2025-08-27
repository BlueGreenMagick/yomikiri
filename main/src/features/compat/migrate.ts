import type { AnyPlatform } from "@/platform/types";
import { migrateV1 } from "./migrateV1";

export async function migrate(platform: AnyPlatform) {
  let state = await platform.userMigrateStep({
    version: "Start",
    data: null,
  });

  let repeated = 0;

  while (state.version !== "V2") {
    if (repeated > 30) {
      throw new Error("Migration failed: exceeded maximum steps");
    }
    repeated += 1;

    if (state.version === "V0") {
      state = await platform.userMigrateStep({
        version: state.version,
        data: null,
      });
    } else if (state.version === "V1") {
      const data = migrateV1(state.state);
      state = await platform.userMigrateStep({
        version: state.version,
        data,
      });
    }
  }
}
