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

export class Dictionary {
  db: Dexie;

  private constructor() {
    this.db = new Dexie("Dictionary");
    this.setupDB();
  }

  private static async downloadFromUrl(url: string): Promise<Entry[]> {
    const resp = await fetch(url);
    const data = await resp.arrayBuffer();
    const unzipped = pako.ungzip(data, { to: "string" }) as string;
    const entryObjects = JSON.parse(unzipped) as any[];
    return entryObjects.map(Entry.fromObject);
  }

  private setupDB() {
    // Should we use multi-valued keys instead of sql-like many-to-many?
    this.db.version(DB_VER).stores({
      entries: "++id, *terms",
      config: "&name",
    });
  }

  private async install(url: string): Promise<void> {
    Utils.bench("Installing dictionary");
    const db = this.db;
    const entries = await Dictionary.downloadFromUrl(url);
    await db.transaction("rw", "entries", "config", async () => {
      await db.table("config").put({ name: "dic_ver", value: DIC_VER });
      await db.table("config").put({ name: "dic_name", value: "English" });
      await db.table("entries").clear();
      await db.table("entries").bulkAdd(entries);
    });
    Utils.bench("Installed dictionary");
  }

  private async getConfig(name: string): Promise<any> {
    return await this.db.table("config").get(name);
  }

  static async initialize(): Promise<Dictionary> {
    const dic = new Dictionary();
    const dic_ver = await dic.getConfig("dic_ver");
    if (!(typeof dic_ver === "object" && dic_ver.value === DIC_VER)) {
      await dic.install(EnJMDict);
    }
    return dic;
  }

  async search(term: string): Promise<Entry[]> {
    return await this.db.table("entries").where("terms").equals(term).toArray();
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
