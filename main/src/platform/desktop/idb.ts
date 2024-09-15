import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type FileName = "yomikiri-dictionary";

interface FilesDBSchema extends DBSchema {
  files: {
    key: FileName;
    value: Uint8Array;
  };
}

export type FilesDB = IDBPDatabase<FilesDBSchema>;

async function openFilesDB(): Promise<IDBPDatabase<FilesDBSchema>> {
  return await openDB<FilesDBSchema>("files", 1, {
    upgrade(db) {
      db.createObjectStore("files", { keyPath: "key" });
      // nothing here yet
    },
  });
}

export async function idbReadFile(
  file: FileName,
): Promise<Uint8Array | undefined> {
  const db = await openFilesDB();
  return db.get("files", file);
}

export async function idbReadFiles(
  files: FileName[],
): Promise<[FileName, Uint8Array | undefined][]> {
  const db = await openFilesDB();
  const tx = db.transaction("files", "readonly");
  const results: [FileName, Uint8Array | undefined][] = [];
  for (const file of files) {
    const content = await tx.store.get(file);
    results.push([file, content]);
  }
  await tx.done;
  return results;
}

export async function idbWriteFiles(
  files: [FileName, Uint8Array][],
): Promise<void> {
  const db = await openFilesDB();
  const tx = db.transaction("files", "readwrite");
  for (const [file, content] of files) {
    await tx.store.put(content, file);
  }
  await tx.done;
}

export async function deleteFiles(filenames: FileName[]): Promise<void> {
  const db = await openFilesDB();
  const tx = db.transaction("files", "readwrite");
  for (const file of filenames) {
    await tx.store.delete(file);
  }
  await tx.done;
}
