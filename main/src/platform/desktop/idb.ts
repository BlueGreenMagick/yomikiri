import { type DBSchema, deleteDB, type IDBPDatabase, openDB } from "idb";

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

export class Database {
  private constructor(private db: IDBPDatabase<YomikiriDBSchema>) {}

  static async init(): Promise<Database> {
    const db = await openFilesDB();
    return new Database(db);
  }

  readFile(file: FileName): Promise<Uint8Array | undefined> {
    const db = this.db;
    const files = db.get(DB_FILES_STORE, file);
    return files;
  }

  async readFiles(
    files: FileName[],
  ): Promise<[FileName, Uint8Array | undefined][]> {
    const tx = this.db.transaction(DB_FILES_STORE, "readonly");
    const results: [FileName, Uint8Array | undefined][] = [];
    for (const file of files) {
      const content = await tx.store.get(file);
      results.push([file, content]);
    }
    await tx.done;
    return results;
  }

  async writeFile(
    file: FileName,
    content: Uint8Array,
  ): Promise<void> {
    await this.db.put(DB_FILES_STORE, content, file);
  }

  async writeFiles(
    files: [FileName, Uint8Array][],
  ): Promise<void> {
    const tx = this.db.transaction(DB_FILES_STORE, "readwrite");
    for (const [file, content] of files) {
      await tx.store.put(content, file);
    }
    await tx.done;
  }

  async deleteFiles(filenames: FileName[]): Promise<void> {
    const tx = this.db.transaction(DB_FILES_STORE, "readwrite");
    for (const file of filenames) {
      await tx.store.delete(file);
    }
    await tx.done;
  }

  async hasFile(filename: FileName): Promise<boolean> {
    const results = await this.hasFiles([filename]);
    return results[0];
  }

  async hasFiles(filenames: FileName[]): Promise<boolean[]> {
    const tx = this.db.transaction(DB_FILES_STORE, "readonly");
    const results: boolean[] = [];
    for (const file of filenames) {
      const count = await tx.store.count(file);
      if (count > 0) {
        results.push(true);
      }
    }
    await tx.done;
    return results;
  }
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

/** Deletes unused idb databases */
async function deleteUnusedDBs(): Promise<void> {
  const dbs = await indexedDB.databases();
  for (const db of dbs) {
    if (db.name !== undefined && db.name !== DB_NAME) {
      await deleteDB(db.name);
    }
  }
}
