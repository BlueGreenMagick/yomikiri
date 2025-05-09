import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from "idb";

const DB_NAME = "yomikiri";
const DB_FILES_STORE = "files";
type FILENAMES = ["yomikiri-dictionary", "JMdict_e.gz", "JMnedict.xml.gz"];

export type FileName = FILENAMES[number];

interface YomikiriDBSchema extends DBSchema {
  files: {
    key: FileName;
    value: Uint8Array;
  };
}

async function openFilesDB(): Promise<IDBPDatabase<YomikiriDBSchema>> {
  return await openDB<YomikiriDBSchema>(DB_NAME, 1, {
    upgrade(db) {
      let has_files_store = false;
      for (const name of db.objectStoreNames) {
        if (name === DB_FILES_STORE) {
          has_files_store = true;
        } else {
          db.deleteObjectStore(name);
        }
      }
      if (!has_files_store) {
        db.createObjectStore(DB_FILES_STORE);
      }

      void deleteUnusedDBs();
    },
  });
}

/** Returns undefined if file does not exist */
export async function idbReadFile(
  file: FileName,
): Promise<Uint8Array | undefined> {
  const db = await openFilesDB();
  const files = db.get(DB_FILES_STORE, file);
  db.close();
  return files;
}

export async function idbReadFiles(
  files: FileName[],
): Promise<[FileName, Uint8Array | undefined][]> {
  const db = await openFilesDB();
  const tx = db.transaction(DB_FILES_STORE, "readonly");
  const results: [FileName, Uint8Array | undefined][] = [];
  for (const file of files) {
    const content = await tx.store.get(file);
    results.push([file, content]);
  }
  await tx.done;
  db.close();
  return results;
}

export async function idbWriteFile(
  file: FileName,
  content: Uint8Array,
): Promise<void> {
  const db = await openFilesDB();
  await db.put(DB_FILES_STORE, content, file);
  db.close();
}

export async function idbWriteFiles(
  files: [FileName, Uint8Array][],
): Promise<void> {
  const db = await openFilesDB();
  const tx = db.transaction(DB_FILES_STORE, "readwrite");
  for (const [file, content] of files) {
    await tx.store.put(content, file);
  }
  await tx.done;
  db.close();
}

export async function idbDeleteFiles(filenames: FileName[]): Promise<void> {
  const db = await openFilesDB();
  const tx = db.transaction(DB_FILES_STORE, "readwrite");
  for (const file of filenames) {
    await tx.store.delete(file);
  }
  db.close();
  await tx.done;
}

export async function idbHasFile(filename: FileName): Promise<boolean> {
  const results = await idbHasFiles([filename]);
  return results[0];
}

export async function idbHasFiles(filenames: FileName[]): Promise<boolean[]> {
  const db = await openFilesDB();
  const tx = db.transaction(DB_FILES_STORE, "readonly");
  const results: boolean[] = [];
  for (const file of filenames) {
    const count = await tx.store.count(file);
    if (count > 0) {
      results.push(true);
    }
  }
  return results;
}

/** Deletes unused idb databases */
async function deleteUnusedDBs(): Promise<void> {
  const dbs = await indexedDB.databases();
  for (const db of dbs) {
    if (db.name !== undefined && db.name !== DB_NAME) {
      await deleteDB(db.name);
    }
  }
}
