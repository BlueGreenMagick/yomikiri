import type Utils from "~/utils";
import type { DictionaryMetadata, IDictionary } from "../common/dictionary"

export type { DictionaryMetadata } from "../common/dictionary";

export namespace Dictionary {
  export function updateDictionary(): Utils.PromiseWithProgress<DictionaryMetadata, string> {
    throw new Error("Not yet implemented on ios");
  }

  export async function dictionaryMetadata(): Promise<DictionaryMetadata> {
    throw new Error("Not yet implemented on iosapp");
  }
}

Dictionary satisfies IDictionary