import Utils from "~/utils";
import type { DictionaryMetadata, IDictionary } from "../common/dictionary"
import { Platform } from ".";

export type { DictionaryMetadata } from "../common/dictionary";

export interface RawDictionaryMetadata {
  downloadDate: string,
  filesSize: number
}

function parseRawMetadata(json: string): DictionaryMetadata {
  const raw: RawDictionaryMetadata = JSON.parse(json)
  return {
    downloadDate: new Date(raw.downloadDate),
    filesSize: raw.filesSize
  }
}


export namespace Dictionary {
  export function updateDictionary(): Utils.PromiseWithProgress<DictionaryMetadata, string> {
    return Utils.PromiseWithProgress.fromPromise(Platform.messageWebview("updateDict", null).then(parseRawMetadata), "Updating dictionary... This may take up to a minute.")
  }

  export async function dictionaryMetadata(): Promise<DictionaryMetadata> {
    let raw = await Platform.messageWebview("dictMetadata", null);
    return parseRawMetadata(raw);
  }
}

Dictionary satisfies IDictionary