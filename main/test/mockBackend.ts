/*
  Mock to load backend wasm in tests.

  This module must be imported before any other imports.
*/
import "platform/desktop/fetch.ts"

import { vi } from "vitest"
import initWasm, { Backend as BackendWasm } from "@yomikiri/yomikiri-rs";
import fs from "node:fs/promises"
import wasm from "@yomikiri/yomikiri-rs/yomikiri_rs_bg.wasm"
import ENYomikiridict from "@yomikiri/dictionary/res/english.yomikiridict";
import ENYomikiriIndex from "@yomikiri/dictionary/res/english.yomikiriindex";


vi.mock("platform/desktop/fetch.ts", async (importOriginal) => {
  console.log("Mocked desktop backend fetch")

  const module: typeof import("platform/desktop/fetch.ts") = await importOriginal()
  return {
    ...module,
    loadWasm,
    loadDictionary
  }
})

async function loadWasm(): Promise<typeof BackendWasm> {
  console.log("Using mocked loadWasm()")
  const buffer = await fs.readFile(wasm)
  await initWasm(buffer)

  return BackendWasm;
}

async function loadDictionary(): Promise<[Uint8Array, Uint8Array]> {
  const indexBuffer = await fs.readFile(ENYomikiriIndex)
  const entriesBuffer = await fs.readFile(ENYomikiridict)
  return [indexBuffer, entriesBuffer];
}