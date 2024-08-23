import { openDB, type DBSchema } from "idb";
import { getStorage, removeStorage } from "extension/browserApi";

interface DictionaryDBSchema extends DBSchema {
  "yomikiri-dictionary": {
    key: "value";
    value: Uint8Array;
  };
}

/**
 * Loads user dictionary (index, entries) if it exists, valid, and fresh.
 * Otherwise, return null and delete saved dictionary.
 */
export async function loadSavedDictionary(
  schemaVer: number,
): Promise<Uint8Array | null> {
  const user_dict_schema_ver = await getStorage("dict.schema_ver");
  if (user_dict_schema_ver === undefined) {
    return null;
  } else if (user_dict_schema_ver !== schemaVer) {
    await deleteSavedDictionary();
    return null;
  } else {
    const db = await openDictionaryDB();
    return (await db.get("yomikiri-dictionary", "value")) ?? null;
  }
}

export async function openDictionaryDB() {
  return await openDB<DictionaryDBSchema>("jmdict", 3, {
    upgrade(db, oldVersion, _newVersion, _transaction, _event) {
      // migration from previous db schema
      if (oldVersion === 1) {
        const storeNames = ["yomikiri-index", "yomikiri-entries", "metadata"];
        for (const name of storeNames) {
          // @ts-expect-error previous version object store names
          if (db.objectStoreNames.contains(name)) {
            // @ts-expect-error previous version object store names
            db.deleteObjectStore(name);
          }
        }
      } else if (oldVersion === 2) {
        // @ts-expect-error previous version object store names
        if (db.objectStoreNames.contains("metadata")) {
          // @ts-expect-error previous version object store names
          db.deleteObjectStore("metadata");
        }
      }
      if (!db.objectStoreNames.contains("yomikiri-dictionary")) {
        db.createObjectStore("yomikiri-dictionary");
      }
    },
  });
}

export async function deleteSavedDictionary() {
  const db = await openDictionaryDB();
  console.info("Will delete user-installed dictionary");
  await db.clear("yomikiri-dictionary");
  await removeStorage("dict.schema_ver");
  console.info("Deleted user-installed dictionary");
}
