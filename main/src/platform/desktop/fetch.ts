/*
  This module contains functions that load external resources.

  These functions are separated into its own module
  in order to replace(mock) them during tests.
*/
import ENYomikiridict from "@yomikiri/generated/dictionary-files/english.yomikiridict";
import initWasm from "@yomikiri/yomikiri-backend-wasm";
import { Backend as BackendWasm } from "@yomikiri/yomikiri-backend-wasm";
import wasm from "@yomikiri/yomikiri-backend-wasm/yomikiri_backend_wasm_bg.wasm";
import { loadSavedDictionary } from "./dictionary";

export async function loadWasm(): Promise<typeof BackendWasm> {
  const resp = await fetch(wasm);
  await initWasm(resp);

  return BackendWasm;
}

export async function loadDictionary(
  dictSchemaVer: number,
): Promise<Uint8Array> {
  const saved = await loadSavedDictionary(dictSchemaVer);
  if (saved !== null) {
    return saved;
  }

  return await fetchBytes(ENYomikiridict);
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const resp = await fetch(url);
  const buffer = await resp.arrayBuffer();
  return new Uint8Array(buffer, 0, buffer.byteLength);
}
