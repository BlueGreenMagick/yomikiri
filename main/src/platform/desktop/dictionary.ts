import { openDB, type DBSchema } from "idb";
import bundledDictMetadata from "@yomikiri/dictionary-files/dictionary-metadata.json";
import type { DictMetadata } from "@yomikiri/yomikiri-rs";

export { default as bundledDictMetadata } from "@yomikiri/dictionary-files/dictionary-metadata.json";

interface DictionaryDBSchema extends DBSchema {
  metadata: {
    key: "value";
    value: DictMetadata;
  };
  "yomikiri-dictionary": {
    key: "value";
    value: Uint8Array;
  };
}

/**
 * Loads user dictionary (index, entries) if it exists, valid, and fresh.
 * Otherwise, return null and delete saved dictionary.
 */
export async function loadSavedDictionary(): Promise<Uint8Array | null> {
  const db = await openDictionaryDB();

  const metadata = await db.get("metadata", "value");
  if (metadata === undefined) return null;
  if (!validateUserDictMetadata(metadata)) {
    void deleteSavedDictionary();
    return null;
  }

  return (await db.get("yomikiri-dictionary", "value")) ?? null;
}

export async function openDictionaryDB() {
  return await openDB<DictionaryDBSchema>("jmdict", 2, {
    upgrade(db, oldVersion, _newVersion, _transaction, _event) {
      if (oldVersion === 1) {
        const storeNames = ["yomikiri-index", "yomikiri-entries", "metadata"];
        for (const name of storeNames) {
          // @ts-expect-error previous version object store names
          if (db.objectStoreNames.contains(name)) {
            // @ts-expect-error previous version object store names
            db.deleteObjectStore(name);
          }
        }
      }
      db.createObjectStore("metadata");
      db.createObjectStore("yomikiri-dictionary");
    },
  });
}

export async function loadDictionaryMetadata(): Promise<DictMetadata> {
  const db = await openDictionaryDB();
  const userDictMetadata = await db.get("metadata", "value");
  if (
    userDictMetadata !== undefined &&
    validateUserDictMetadata(userDictMetadata)
  ) {
    return userDictMetadata;
  } else {
    return bundledDictMetadata;
  }
}

export async function deleteSavedDictionary() {
  const db = await openDictionaryDB();
  console.info("Will delete user-installed dictionary");
  await db.clear("metadata");
  await db.clear("yomikiri-dictionary");
  console.info("Deleted user-installed dictionary");
}

/** Return true if user dictionary is has valid schema and is fresh */
function validateUserDictMetadata(userDict: DictMetadata): boolean {
  if (userDict.schemaVer !== bundledDictMetadata.schemaVer) {
    return false;
  }

  const userDownloadDate = new Date(userDict.downloadDate);
  const bundledDownloadDate = new Date(bundledDictMetadata.downloadDate);
  if (userDownloadDate.getTime() <= bundledDownloadDate.getTime()) {
    return false;
  }
  return true;
}
