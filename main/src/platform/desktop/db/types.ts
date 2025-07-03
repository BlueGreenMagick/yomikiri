import type { DBSchema } from "idb";

export interface YomikiriDBSchema extends DBSchema {
  files: {
    key: "yomikiri-dictionary" | "JMdict_e.gz" | "JMnedict.xml.gz";
    value: Uint8Array;
  };
  storage: {
    key: string;
    value: unknown;
  };
}

export type FileName = YomikiriDBSchema["files"]["key"];
