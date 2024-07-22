import type { DictionaryMetadata, RawDictionaryMetadata } from "@platform";

export function parseRawMetadata(
  raw: RawDictionaryMetadata,
): DictionaryMetadata {
  return {
    downloadDate: new Date(raw.downloadDate),
    filesSize: raw.filesSize,
  };
}
