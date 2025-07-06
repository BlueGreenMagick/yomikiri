import { type IDBPDatabase, openDB } from "idb";
import { migrateDB } from "./compat";
import { FilesDB } from "./filesDB";
import { StoreDB } from "./storeDB";
import type { YomikiriDBSchema } from "./types";

const DB_NAME = "yomikiri";

const IDB_VERSION = 2;

export class Database {
  private constructor(
    private db: IDBPDatabase<YomikiriDBSchema>,
    public files = new FilesDB(this.db),
    public store = new StoreDB(this.db),
  ) {}

  static async init(): Promise<Database> {
    const db = await openFilesDB();
    return new Database(db);
  }
}

async function openFilesDB(): Promise<IDBPDatabase<YomikiriDBSchema>> {
  return await openDB<YomikiriDBSchema>(DB_NAME, IDB_VERSION, {
    upgrade(db, oldVersion) {
      migrateDB(db, oldVersion);
    },
  });
}
