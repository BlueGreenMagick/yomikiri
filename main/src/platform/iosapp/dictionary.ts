import Utils from "~/utils";
import type { DictionaryMetadata, IDictionary } from "../common/dictionary"
import { Platform } from ".";

export type { DictionaryMetadata } from "../common/dictionary";

export namespace Dictionary {
  export function updateDictionary(): Utils.PromiseWithProgress<DictionaryMetadata, string> {
    return Utils.PromiseWithProgress.fromPromise(Platform.messageWebview("updateDict", null), "Updating dictionary... This may take up to a minute.")
  }

  export async function dictionaryMetadata(): Promise<DictionaryMetadata> {
    return Platform.messageWebview("dictMetadata", null);
  }
}

Dictionary satisfies IDictionary