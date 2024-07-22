import Utils from "lib/utils";
import type {
  DictionaryMetadata,
  IDictionary as IDictionary,
} from "../common/dictionary";
import { openDB, type DBSchema } from "idb";
import type { DesktopBackend } from "./backend";
import type { Backend } from "@yomikiri/yomikiri-rs";
import BundledDictMetadata from "@yomikiri/dictionary-files/dictionary-metadata.json";
import { createConnection } from "extension/browserApi";
import { EXTENSION_CONTEXT } from "consts";

export type { DictionaryMetadata } from "../common/dictionary";

interface DictionaryDBSchema extends DBSchema {
  metadata: {
    key: string;
    value: DictionaryMetadata;
  };
  "yomikiri-index": {
    key: "value";
    value: Uint8Array;
  };
  "yomikiri-entries": {
    key: "value";
    value: Uint8Array;
  };
}

export class DesktopDictionary implements IDictionary {
  wasm: Backend | undefined;

  constructor(backend: DesktopBackend) {
    this.wasm = backend.wasm;
  }

  updateDictionary(): Utils.PromiseWithProgress<DictionaryMetadata, string> {
    throw new Error("TODO: Currently not supported!");
    if (EXTENSION_CONTEXT === "background") {
      const prom = Utils.PromiseWithProgress.fromPromise(
        this._updateDictionary(progressFn),
        "Downloading JMDict file...",
      );

      function progressFn(msg: string) {
        prom.setProgress(msg);
      }
      return prom;
    } else {
      const _port = createConnection("updateDictionary");
    }
  }

  private async _updateDictionary(
    progressFn: (msg: string) => unknown,
  ): Promise<DictionaryMetadata> {
    const [index_bytes, entries_bytes] =
      await this._createNewDictionary(progressFn);
    progressFn("Saving dictionary file...");
    const downloadDate = new Date();
    const metadata: DictionaryMetadata = {
      downloadDate,
      filesSize: index_bytes.byteLength + entries_bytes.byteLength,
    };
    await Utils.nextDocumentPaint();

    const db = await openDictionaryDB();
    const tx = db.transaction(
      ["metadata", "yomikiri-index", "yomikiri-entries"],
      "readwrite",
    );
    await Promise.all([
      tx.objectStore("metadata").put(metadata, "value"),
      tx.objectStore("yomikiri-index").put(index_bytes, "value"),
      tx.objectStore("yomikiri-entries").put(entries_bytes, "value"),
    ]);
    await tx.done;
    return metadata;
  }

  private async _createNewDictionary(
    progressFn: (msg: string) => unknown,
  ): Promise<[Uint8Array, Uint8Array]> {
    const buffer = await fetch(
      "http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz",
    ).then((resp) => resp.arrayBuffer());
    const typedarray = new Uint8Array(buffer);
    progressFn("Creating dictionary file...");
    await Utils.nextDocumentPaint();
    return this.wasm.update_dictionary(typedarray);
  }
}

/** Loads (index, entries) if saved in db. Returns null otherwise. */
export async function loadSavedDictionary(): Promise<
  [Uint8Array, Uint8Array] | null
> {
  const db = await openDictionaryDB();
  const yomikiriIndexP = db.get("yomikiri-index", "value");
  const yomikiriEntriesP = db.get("yomikiri-entries", "value");
  const [yomikiriIndexBytes, yomikiriEntriesBytes] = await Promise.all([
    yomikiriIndexP,
    yomikiriEntriesP,
  ]);
  if (yomikiriIndexBytes !== undefined && yomikiriEntriesBytes !== undefined) {
    return [yomikiriIndexBytes, yomikiriEntriesBytes];
  } else {
    return null;
  }
}

async function openDictionaryDB() {
  return await openDB<DictionaryDBSchema>("jmdict", 1, {
    upgrade(db, _oldVersion, _newVersion, _transaction, _event) {
      db.createObjectStore("metadata");
      db.createObjectStore("yomikiri-index");
      db.createObjectStore("yomikiri-entries");
    },
  });
}

export async function dictionaryMetadata(): Promise<DictionaryMetadata> {
  const db = await openDictionaryDB();
  const installedMetadata = await db.get("metadata", "value");
  if (installedMetadata !== undefined) {
    return installedMetadata;
  } else {
    return {
      ...BundledDictMetadata,
      downloadDate: new Date(BundledDictMetadata.downloadDate),
    };
  }
}

export const Dictionary = DesktopDictionary;
export type Dictionary = DesktopDictionary;
