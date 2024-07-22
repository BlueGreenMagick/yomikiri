import type { DictionaryMetadata } from "../common";
import { openDB, type DBSchema } from "idb";
import BundledDictMetadata from "@yomikiri/dictionary-files/dictionary-metadata.json";

interface DictionaryDBSchema extends DBSchema {
  metadata: {
    key: string;
    value: DictionaryMetadata;
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

/** Loads (index, entries) if saved in db. Returns null otherwise. */
export async function loadSavedDictionary(): Promise<
  [Uint8Array, Uint8Array] | null
> {
  const db = await openDictionaryDB();
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

export async function dictionaryMetadata(): Promise<DictionaryMetadata> {
  const db = await openDictionaryDB();
  const installedMetadata = await db.get("metadata", "value");
  if (installedMetadata !== undefined) {
    return installedMetadata;
  } else {
    return {
      ...BundledDictMetadata,
      downloadDate: new Date(BundledDictMetadata.downloadDate),
    };
  }
}
