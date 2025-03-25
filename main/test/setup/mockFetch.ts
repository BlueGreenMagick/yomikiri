/*
  Replaces code that uses browser-specific api (e.g. `fetch()`) or extension API.

  This module must be imported before any other imports.
*/

import { vi } from "vitest";
import initWasm, {
  Backend as BackendWasm,
} from "@yomikiri/yomikiri-backend-wasm";
import fs from "node:fs/promises";
import wasm from "@yomikiri/yomikiri-backend-wasm/yomikiri_backend_wasm_bg.wasm";
import ENYomikiridict from "@yomikiri/generated/dictionary-files/english.yomikiridict";

/* Mock load process of backend wasm */

vi.mock(
  "@/platform/desktop/fetch.ts",
  async (
    importOriginal,
  ): Promise<typeof import("@/platform/desktop/fetch.ts")> => {
    const module: typeof import("@/platform/desktop/fetch.ts") =
      await importOriginal();
    return {
      ...module,
      loadWasm,
      loadDictionary,
    };
  },
);

async function loadWasm(): Promise<typeof BackendWasm> {
  const buffer = await fs.readFile(vitePath(wasm));
  await initWasm(buffer);

  return BackendWasm;
}

async function loadDictionary(_schemaVer: number): Promise<Uint8Array> {
  return await fs.readFile(vitePath(ENYomikiridict));
}

function vitePath(path: string): string {
  if (path.startsWith("/@fs/")) {
    return path.substring("/@fs".length);
  } else {
    return path;
  }
}
