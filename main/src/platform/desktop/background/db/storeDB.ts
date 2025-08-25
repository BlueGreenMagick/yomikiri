import type { IDBPDatabase } from "idb";
import type { YomikiriDBSchema } from "./types";

const _STORE_NAME = "store";

/** Database wrapper for key-value store operations. */
export class StoreDB {
  constructor(private db: IDBPDatabase<YomikiriDBSchema>) {}
}
