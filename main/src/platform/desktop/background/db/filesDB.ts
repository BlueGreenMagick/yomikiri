import type { IDBPDatabase } from "idb";
import type { FileName, YomikiriDBSchema } from "./types";

const STORE_NAME = "files";

export class FilesDB {
  constructor(private db: IDBPDatabase<YomikiriDBSchema>) {}

  readFile(file: FileName): Promise<Uint8Array | undefined> {
    const db = this.db;
    const files = db.get(STORE_NAME, file);
    return files;
  }

  async readFiles(
    files: FileName[],
  ): Promise<[FileName, Uint8Array | undefined][]> {
    const tx = this.db.transaction(STORE_NAME, "readonly");
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
    await this.db.put(STORE_NAME, content, file);
  }

  async writeFiles(
    files: [FileName, Uint8Array][],
  ): Promise<void> {
    const tx = this.db.transaction(STORE_NAME, "readwrite");
    for (const [file, content] of files) {
      await tx.store.put(content, file);
    }
    await tx.done;
  }

  async deleteFiles(filenames: FileName[]): Promise<void> {
    const tx = this.db.transaction(STORE_NAME, "readwrite");
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
    const tx = this.db.transaction(STORE_NAME, "readonly");
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
