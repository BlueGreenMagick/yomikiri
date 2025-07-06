import type { DBSchema, IDBPDatabase } from "idb";
import type { YomikiriDBSchema } from "./types";

type YomikiriDBSchemaV0 = DBSchema;

interface YomikiriDBSchemaV1 extends DBSchema {
  files: {
    key: ["yomikiri-dictionary", "JMdict_e.gz", "JMnedict.xml.gz"];
    value: Uint8Array;
  };
}
type YomikiriDBSchemaCompat = YomikiriDBSchemaV0 | YomikiriDBSchemaV1 | YomikiriDBSchema;

export function migrateDB(
  dbRaw: IDBPDatabase<YomikiriDBSchema>,
  oldVersion: number,
) {
  const db = dbRaw as IDBPDatabase<YomikiriDBSchemaCompat>;
  if (oldVersion <= 0) {
    if (db.objectStoreNames.contains("files")) {
      db.deleteObjectStore("files");
    }
    db.createObjectStore("files");
  }
  if (oldVersion <= 1) {
    if (db.objectStoreNames.contains("store")) {
      db.deleteObjectStore("store");
    }
    db.createObjectStore("store");
  }
}
