import type Utils from "~/utils";

export interface DictionaryMetadata {
  downloadDate: Date,
  // bytes len
  filesSize: number
}

export interface IDictionary {
  updateDictionary(): Utils.PromiseWithProgress<DictionaryMetadata, string>;
  dictionaryMetadata(): Promise<DictionaryMetadata>;
}

export declare const Dictionary: IDictionary