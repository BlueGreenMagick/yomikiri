import DICTIONARY_WASM_URL from "@yomikiri/yomikiri-dictionary/yomikiri_dictionary_bg.wasm";
import initWasm, { create_dictionary } from "@yomikiri/yomikiri-dictionary";
import BundledDictMetadata from "@yomikiri/dictionary/res/dictionary-metadata.json";
import Utils from "lib/utils";
import type {
  DictionaryMetadata,
  IDictionary as IDictionary,
} from "../common/dictionary";
import { openDB, type DBSchema } from "idb";

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
  _wasm_initialized = false;

  updateDictionary(): Utils.PromiseWithProgress<DictionaryMetadata, string> {
    const prom = Utils.PromiseWithProgress.fromPromise(
      this._updateDictionary(progressFn),
      "Downloading JMDict file...",
    );

    function progressFn(msg: string) {
      prom.setProgress(msg);
    }
    return prom;
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

    const db = await this.openDictionaryDB();
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
    const wasmP = this.loadWasm();
    const bufferP = fetch("http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz").then(
      (resp) => resp.arrayBuffer(),
    );
    const [_wasm, buffer] = await Promise.all([wasmP, bufferP]);
    const typedarray = new Uint8Array(buffer);
    progressFn("Creating dictionary file...");
    await Utils.nextDocumentPaint();
    return create_dictionary(typedarray);
  }

  async openDictionaryDB() {
    return await openDB<DictionaryDBSchema>("jmdict", 1, {
      upgrade(db, _oldVersion, _newVersion, _transaction, _event) {
        db.createObjectStore("metadata");
        db.createObjectStore("yomikiri-index");
        db.createObjectStore("yomikiri-entries");
      },
    });
  }

  async dictionaryMetadata(): Promise<DictionaryMetadata> {
    const db = await this.openDictionaryDB();
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

  private async loadWasm(): Promise<void> {
    if (this._wasm_initialized) return;
    // @ts-expect-error wasm is string
    const resp = await fetch(DICTIONARY_WASM_URL);
    await initWasm(resp);
    this._wasm_initialized = true;
  }

  /** Loads (index, entries) if saved in db. Returns null otherwise. */
  async loadSavedDictionary(): Promise<[Uint8Array, Uint8Array] | null> {
    const db = await this.openDictionaryDB();
    const yomikiriIndexP = db.get("yomikiri-index", "value");
    const yomikiriEntriesP = db.get("yomikiri-entries", "value");
    const [yomikiriIndexBytes, yomikiriEntriesBytes] = await Promise.all([
      yomikiriIndexP,
      yomikiriEntriesP,
    ]);
    if (
      yomikiriIndexBytes !== undefined &&
      yomikiriEntriesBytes !== undefined
    ) {
      return [yomikiriIndexBytes, yomikiriEntriesBytes];
    } else {
      return null;
    }
  }
}

export const Dictionary = DesktopDictionary;
export type Dictionary = DesktopDictionary;
