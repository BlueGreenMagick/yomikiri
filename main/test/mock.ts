/*
  Replaces code that uses browser-specific api (e.g. `fetch()`) or extension API.

  This module must be imported before any other imports.
*/
import "platform/desktop/fetch.ts";

import { vi } from "vitest";
import initWasm, { Backend as BackendWasm } from "@yomikiri/yomikiri-rs";
import fs from "node:fs/promises";
import wasm from "@yomikiri/yomikiri-rs/yomikiri_rs_bg.wasm";
import ENYomikiridict from "@yomikiri/dictionary/res/english.yomikiridict";
import ENYomikiriIndex from "@yomikiri/dictionary/res/english.yomikiriindex";
import type { StoredConfiguration } from "lib/config";
import { DesktopPlatform } from "platform/desktop";

/* Mock config */
let storedConfig: StoredConfiguration | Record<string, never> = {};

DesktopPlatform.prototype.getConfig = () => {
  return Promise.resolve(storedConfig);
};
DesktopPlatform.prototype.saveConfig = (conf) => {
  storedConfig = conf;
  return Promise.resolve();
};

export function setStoredConfig(
  conf: StoredConfiguration | Record<string, never>,
) {
  storedConfig = conf;
}

/* Mock load process of backend wasm */

vi.mock("platform/desktop/fetch.ts", async (importOriginal) => {
  console.log("Mocked desktop backend fetch");

  const module: typeof import("platform/desktop/fetch.ts") =
    await importOriginal();
  return {
    ...module,
    loadWasm,
    loadDictionary,
  };
});

async function loadWasm(): Promise<typeof BackendWasm> {
  const buffer = await fs.readFile(vitePath(wasm));
  await initWasm(buffer);

  return BackendWasm;
}

async function loadDictionary(): Promise<[Uint8Array, Uint8Array]> {
  const indexBuffer = await fs.readFile(vitePath(ENYomikiriIndex));
  const entriesBuffer = await fs.readFile(vitePath(ENYomikiridict));
  return [indexBuffer, entriesBuffer];
}

function vitePath(path: string): string {
  if (path.startsWith("/@fs/")) {
    return path.substring("/@fs".length);
  } else {
    return path;
  }
}
