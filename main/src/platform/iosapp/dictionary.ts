import Utils from "lib/utils";
import type { DictionaryMetadata, IDictionary } from "../common/dictionary";
import { IosAppPlatform } from ".";

export type { DictionaryMetadata } from "../common/dictionary";

export interface RawDictionaryMetadata {
  downloadDate: string;
  filesSize: number;
}

function parseRawMetadata(raw: RawDictionaryMetadata): DictionaryMetadata {
  return {
    downloadDate: new Date(raw.downloadDate),
    filesSize: raw.filesSize,
  };
}

export class IosAppDictionary implements IDictionary {
  updateDictionary(): Utils.PromiseWithProgress<DictionaryMetadata, string> {
    return Utils.PromiseWithProgress.fromPromise(
      IosAppPlatform.messageWebview("updateDict", null).then(parseRawMetadata),
      "Updating dictionary... This may take up to a minute.",
    );
  }

  async dictionaryMetadata(): Promise<DictionaryMetadata> {
    const raw = await IosAppPlatform.messageWebview("dictMetadata", null);
    return parseRawMetadata(raw);
  }
}

export const Dictionary = IosAppDictionary;
export type Dictionary = IosAppDictionary;
