import type Utils from "~/utils";
import type { Dictionary as DesktopDictionary } from "../desktop/dictionary"
import type { Dictionary as IosAppDictionary } from "../iosapp/dictionary"

export type { Dictionary as DesktopDictionary } from "../desktop/dictionary"
export type { Dictionary as IosAppDictionary } from "../iosapp/dictionary"

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