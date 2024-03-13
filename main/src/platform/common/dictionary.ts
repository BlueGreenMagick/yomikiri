import type Utils from "~/utils";

export interface DictionaryMetadata {
  download_date: Date,
  // bytes len
  files_size: number
}

export interface IDictionary {
  updateDictionary(): Utils.PromiseWithProgress<DictionaryMetadata, string>;
  dictionaryMetadata(): Promise<DictionaryMetadata>;
}