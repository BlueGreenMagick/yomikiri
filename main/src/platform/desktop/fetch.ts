/*
  This module contains functions that load external resources.

  These functions are separated into its own module
  in order to replace(mock) them during tests.
*/
import wasm from "@yomikiri/yomikiri-backend/yomikiri_rs_bg.wasm";
import ENYomikiridict from "@yomikiri/dictionary/res/english.yomikiridict";
import ENYomikiriIndex from "@yomikiri/dictionary/res/english.yomikiriindex";
import initWasm from "@yomikiri/yomikiri-backend";
import { Backend as BackendWasm } from "@yomikiri/yomikiri-backend";
import { Dictionary } from "./dictionary";

export async function loadWasm(): Promise<typeof BackendWasm> {
  const resp = await fetch(wasm);
  await initWasm(resp);

  return BackendWasm;
}

export async function loadDictionary(): Promise<[Uint8Array, Uint8Array]> {
  const dictionary = new Dictionary();
  const saved = await dictionary.loadSavedDictionary();
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
