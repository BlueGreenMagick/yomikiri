import type { LazyAsync } from "@/features/utils";
import type { Database } from "../db";

export class DesktopPlatformBackground {
  constructor(public readonly db: LazyAsync<Database>) {}
}
