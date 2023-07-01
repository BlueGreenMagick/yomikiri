import pako from "pako";
import Dexie from "dexie";
import Utils from "~/utils";
import EnJMDict from "./assets/jmdict/en.json.gz";
import { Entry } from "./dicEntry";

/*
An entry can contain 0+ form, 1+ reading, and 1+ sense.

A reading can contain 0+ to_form. If 0, the reading is applied to all forms. 
If nokanji, it is associated with forms, but are not the true readings of the forms.
Else, only to specified forms.

A sense can contain 0+ to_reading, and 0+ to_form.

*/

// db schema version
const DB_VER = 1;
// dictionary schema version
const DIC_VER = 1;

interface Config {
  name: string;
  value: any;
}
export type ProgressFn = (progress: InstallProgress) => void;

/** If total === -1, it means entries were not loaded yet */
export interface InstallProgress {
  current: number;
  total: number;
}

export class Dictionary {
  db: Dexie;
  installed: boolean = false;
  lastUpdateProgress?: InstallProgress;
  installProgressHandlers: ProgressFn[] = [];

  constructor() {
    this.db = new Dexie("Dictionary");
    this.setupDB();
  }

  private static async downloadFromUrl(url: string): Promise<any[]> {
    const resp = await fetch(url);
    const data = await resp.arrayBuffer();
    const unzipped = pako.ungzip(data, { to: "string" }) as string;
    const entryObjects = JSON.parse(unzipped) as any[];
    for (const entry of entryObjects) {
      const terms = [];
      if (entry.forms !== undefined) {
        for (const form of entry.forms) {
          terms.push(form.form);
        }
      }
      for (const reading of entry.readings) {
        terms.push(reading.reading);
      }
      entry.terms = terms;
    }
    return entryObjects;
  }

  private setupDB() {
    // Should we use multi-valued keys instead of sql-like many-to-many?
    this.db.version(DB_VER).stores({
      entries: "++id, *terms",
      config: "&name",
    });
  }

  async requiresInstall(): Promise<boolean> {
    const dic_ver = await this.getConfig("dic_ver");
    console.log(dic_ver);
    return !(typeof dic_ver === "object" && dic_ver.value === DIC_VER);
  }

  private async install(): Promise<void> {
    Utils.bench("Installing dictionary");
    this.updateProgress({ current: 0, total: -1 });
    const db = this.db;
    const entries = await Dictionary.downloadFromUrl(EnJMDict);
    const BULK_CNT = 100;
    await db.transaction("rw", "entries", "config", async () => {
      await db.table("config").put({ name: "dic_ver", value: DIC_VER });
      await db.table("config").put({ name: "dic_name", value: "English" });
      await db.table("entries").clear();
      for (let i = 0; i < entries.length / BULK_CNT; i++) {
        this.updateProgress({ current: BULK_CNT * i, total: entries.length });
        const slice = entries.slice(BULK_CNT * i, BULK_CNT * i + BULK_CNT);
        await db.table("entries").bulkAdd(slice);
      }
    });
    Utils.bench("Installed dictionary");
  }

  private updateProgress(progress: InstallProgress): void {
    this.lastUpdateProgress = progress;
    for (const handler of this.installProgressHandlers) {
      handler(progress);
    }
  }

  private async getConfig(name: string): Promise<any> {
    return await this.db.table("config").get(name);
  }

  async initialize(): Promise<Dictionary> {
    if (await this.requiresInstall()) {
      await this.install();
    }
    this.installed = true;
    return this;
  }

  async search(term: string): Promise<Entry[]> {
    const objs = await this.db
      .table("entries")
      .where("terms")
      .equals(term)
      .toArray();
    return objs.map(Entry.fromObject).sort((a, b) => b.priority - a.priority);
  }

  async hasStartsWith(
    term: string,
    filter?: (entry: Entry) => boolean
  ): Promise<boolean> {
    if (!filter) {
      filter = (e: Entry) => true;
    }
    const entry = await this.db
      .table("entries")
      .where("terms")
      .startsWith(term)
      .distinct()
      .filter(filter)
      .first();
    return entry !== undefined;
  }
}
