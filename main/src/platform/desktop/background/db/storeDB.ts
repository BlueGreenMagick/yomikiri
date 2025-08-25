import type { NullPartial } from "@/features/utils";
import type { IDBPDatabase } from "idb";
import type { YomikiriDBSchema } from "./types";

const STORE_NAME = "store";

/** Database wrapper for key-value store operations. */
export class StoreDB {
  constructor(private db: IDBPDatabase<YomikiriDBSchema>) {}

  /** Get multiple values from store in a single transaction. Missing keys return null. */
  async getStoreBatch<T extends Record<string, unknown>>(
    keys: (Extract<keyof T, string>)[],
  ): Promise<NullPartial<T>> {
    const tx = this.db.transaction(STORE_NAME, "readonly");
    const result: Record<string, object | null> = {};
    for (const key of keys) {
      const value = await tx.store.get(key);
      if (value === undefined) {
        result[key] = null;
      } else {
        result[key] = value;
      }
    }
    await tx.done;
    return result as NullPartial<T>;
  }
}
