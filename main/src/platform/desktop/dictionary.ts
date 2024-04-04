import DICTIONARY_WASM_URL from "@yomikiri/yomikiri-dictionary/yomikiri_dictionary_bg.wasm";
import initWasm, { create_dictionary } from "@yomikiri/yomikiri-dictionary"
import BundledDictMetadata from "@yomikiri/dictionary/dictionary-metadata.json";
import Utils from "~/utils";
import type { DictionaryMetadata, IDictionary as IDictionary, } from "../common/dictionary"
import { openDB, type DBSchema } from "idb"

export type { DictionaryMetadata } from "../common/dictionary";

export namespace Dictionary {
  let _wasm_initialized = false;


  interface DictionaryDBSchema extends DBSchema {
    "metadata": {
      key: string,
      value: DictionaryMetadata,
    },
    "yomikiri-index": {
      key: "value",
      value: Uint8Array,
    },
    "yomikiri-entries": {
      key: "value",
      value: Uint8Array,
    }
  }


  export function updateDictionary(): Utils.PromiseWithProgress<DictionaryMetadata, string> {
    let prom: Utils.PromiseWithProgress<DictionaryMetadata, string>;
    const progressFn = (msg: string) => {
      prom.setProgress(msg);
    }
    prom = Utils.PromiseWithProgress.fromPromise(_updateDictionary(progressFn), "Downloading JMDict file...")
    return prom;
  }

  async function _updateDictionary(progressFn: (msg: string) => unknown): Promise<DictionaryMetadata> {
    const [index_bytes, entries_bytes] = await _createNewDictionary(progressFn)
    progressFn("Saving dictionary file...")
    const downloadDate = new Date();
    const metadata: DictionaryMetadata = {
      downloadDate,
      filesSize: index_bytes.byteLength + entries_bytes.byteLength
    };
    await Utils.nextDocumentPaint();

    const db = await openDictionaryDB();
    const tx = await db.transaction(["metadata", "yomikiri-index", "yomikiri-entries"], "readwrite");
    tx.objectStore("metadata").put(metadata, "value");
    tx.objectStore("yomikiri-index").put(index_bytes, "value");
    tx.objectStore("yomikiri-entries").put(entries_bytes, "value");
    await tx.done;

    return metadata;
  }

  async function _createNewDictionary(progressFn: (msg: string) => unknown): Promise<[Uint8Array, Uint8Array]> {
    const wasmP = loadWasm();
    const bufferP = fetch("http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz").then((resp) => resp.arrayBuffer());
    const [_wasm, buffer] = await Promise.all([wasmP, bufferP]);
    const typedarray = new Uint8Array(buffer);
    progressFn("Creating dictionary file...")
    await Utils.nextDocumentPaint();
    return create_dictionary(typedarray)
  }

  export async function openDictionaryDB() {
    return await openDB<DictionaryDBSchema>("jmdict", 1, {
      upgrade(db, oldVersion, newVersion, transaction, event) {
        db.createObjectStore("metadata")
        db.createObjectStore("yomikiri-index")
        db.createObjectStore("yomikiri-entries")
      }
    });
  }

  export async function dictionaryMetadata(): Promise<DictionaryMetadata> {
    const db = await openDictionaryDB();
    const installedMetadata = await db.get("metadata", "value")
    if (installedMetadata !== undefined) {
      return installedMetadata
    } else {
      return {
        ...BundledDictMetadata,
        downloadDate: new Date(BundledDictMetadata.downloadDate),
      }
    }
  }

  async function loadWasm(): Promise<void> {
    if (_wasm_initialized) return;
    // @ts-expect-error wasm is string
    const resp = await fetch(DICTIONARY_WASM_URL);
    await initWasm(resp);
    _wasm_initialized = true;
  }

  /** Loads (index, entries) if saved in db. Returns null otherwise. */
  export async function loadSavedDictionary(): Promise<[Uint8Array, Uint8Array] | null> {
    const db = await Dictionary.openDictionaryDB();
    const yomikiriIndexP = db.get("yomikiri-index", "value");
    const yomikiriEntriesP = db.get("yomikiri-entries", "value");
    const [yomikiriIndexBytes, yomikiriEntriesBytes] = await Promise.all([yomikiriIndexP, yomikiriEntriesP]);
    if (yomikiriIndexBytes !== undefined && yomikiriEntriesBytes !== undefined) {
      return [yomikiriIndexBytes, yomikiriEntriesBytes];
    } else {
      return null;
    }
  }
}

Dictionary satisfies IDictionary