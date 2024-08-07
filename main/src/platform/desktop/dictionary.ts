import { openDB, type DBSchema } from "idb";
import bundledDictMetadata from "@yomikiri/dictionary-files/dictionary-metadata.json";
import type { DictMetadata } from "@yomikiri/yomikiri-rs";

export { default as bundledDictMetadata } from "@yomikiri/dictionary-files/dictionary-metadata.json";

interface DictionaryDBSchema extends DBSchema {
  metadata: {
    key: "value";
    value: DictMetadata;
  };
  "yomikiri-index": {
    key: "value";
    value: Uint8Array;
  };
  "yomikiri-entries": {
    key: "value";
    value: Uint8Array;
  };
}

/**
 * Loads user dictionary (index, entries) if it exists, valid, and fresh.
 * Otherwise, return null and delete saved dictionary.
 */
export async function loadSavedDictionary(): Promise<
  [Uint8Array, Uint8Array] | null
> {
  const db = await openDictionaryDB();

  const metadata = await db.get("metadata", "value");
  if (metadata === undefined) return null;
  if (!validateUserDictMetadata(metadata)) {
    void deleteSavedDictionary();
    return null;
  }

  const yomikiriIndexP = db.get("yomikiri-index", "value");
  const yomikiriEntriesP = db.get("yomikiri-entries", "value");
  const [yomikiriIndexBytes, yomikiriEntriesBytes] = await Promise.all([
    yomikiriIndexP,
    yomikiriEntriesP,
  ]);
  if (yomikiriIndexBytes !== undefined && yomikiriEntriesBytes !== undefined) {
    return [yomikiriIndexBytes, yomikiriEntriesBytes];
  } else {
    return null;
  }
}

export async function openDictionaryDB() {
  return await openDB<DictionaryDBSchema>("jmdict", 1, {
    upgrade(db, _oldVersion, _newVersion, _transaction, _event) {
      db.createObjectStore("metadata");
      db.createObjectStore("yomikiri-index");
      db.createObjectStore("yomikiri-entries");
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
  await Promise.all([
    db.clear("yomikiri-index"),
    db.clear("yomikiri-entries"),
    db.clear("metadata"),
  ]);
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
