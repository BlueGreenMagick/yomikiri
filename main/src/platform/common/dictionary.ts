import type Utils from "lib/utils";
import type { DesktopDictionary } from "../desktop/dictionary"
import type { IosAppDictionary } from "../iosapp/dictionary"

export type { DesktopDictionary } from "../desktop/dictionary"
export type { IosAppDictionary } from "../iosapp/dictionary"

export interface DictionaryMetadata {
  downloadDate: Date,
  // bytes len
  filesSize: number
}

export interface IDictionary {
  updateDictionary(): Utils.PromiseWithProgress<DictionaryMetadata, string>;
  dictionaryMetadata(): Promise<DictionaryMetadata>;
}

export type Dictionary = DesktopDictionary | IosAppDictionary