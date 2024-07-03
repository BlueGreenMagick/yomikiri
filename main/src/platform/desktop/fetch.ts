/*
  This module contains functions that load external resources.

  These functions are separated into its own module
  in order to replace(mock) them during tests.
*/
import wasm from "@yomikiri/yomikiri-rs/yomikiri_rs_bg.wasm";
import ENYomikiridict from "@yomikiri/dictionary-files/english.yomikiridict";
import ENYomikiriIndex from "@yomikiri/dictionary-files/english.yomikiriindex";
import initWasm from "@yomikiri/yomikiri-rs";
import { Backend as BackendWasm } from "@yomikiri/yomikiri-rs";
import { loadSavedDictionary } from "./dictionary";

export async function loadWasm(): Promise<typeof BackendWasm> {
  const resp = await fetch(wasm);
  await initWasm(resp);

  return BackendWasm;
}

export async function loadDictionary(): Promise<[Uint8Array, Uint8Array]> {
  const saved = await loadSavedDictionary();
  if (saved !== null) {
    return saved;
  }

  const defaultIndexP = fetchBytes(ENYomikiriIndex);
  const defaultEntriesP = fetchBytes(ENYomikiridict);
  const [indexBytes, entriesBytes] = await Promise.all([
    defaultIndexP,
    defaultEntriesP,
  ]);
  return [indexBytes, entriesBytes];
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const resp = await fetch(url);
  const buffer = await resp.arrayBuffer();
  return new Uint8Array(buffer, 0, buffer.byteLength);
}
