import { getStorage, removeStorage } from "extension/browserApi";
import { deleteFiles, idbReadFile } from "./idb";

/**
 * Loads user dictionary (index, entries) if it exists, valid, and fresh.
 * Otherwise, return null and delete saved dictionary.
 */
export async function loadSavedDictionary(
  schemaVer: number,
): Promise<Uint8Array | null> {
  const user_dict_schema_ver = await getStorage("dict.schema_ver");
  if (user_dict_schema_ver === undefined) {
    return null;
  } else if (user_dict_schema_ver !== schemaVer) {
    await deleteSavedDictionary();
    return null;
  } else {
    return (await idbReadFile("yomikiri-dictionary")) ?? null;
  }
}

export async function deleteSavedDictionary() {
  console.info("Will delete user-installed dictionary");
  await deleteFiles(["yomikiri-dictionary"]);
  await removeStorage("dict.schema_ver");
  await removeStorage("dict.jmdict.etag");
  console.info("Deleted user-installed dictionary");
}
