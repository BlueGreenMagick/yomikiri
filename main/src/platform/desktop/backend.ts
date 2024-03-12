import {
  type IBackend,
  TokenizeResult,
  type DictionaryMetadata,
} from "../common/backend";
import initWasm from "@yomikiri/yomikiri-rs";
import ENYomikiridict from "@yomikiri/jmdict/english.yomikiridict";
import ENYomikiriIndex from "@yomikiri/jmdict/english.yomikiriindex";
import { Backend as BackendWasm, create_dictionary } from "@yomikiri/yomikiri-rs";
import { Entry } from "~/dicEntry";
import { BrowserApi } from "~/extension/browserApi";
import wasm from "@yomikiri/yomikiri-rs/yomikiri_rs_bg.wasm"
import Utils from "~/utils";
import { openDB, type DBSchema } from "idb"

export {
  type Token,
  type TokenizeRequest,
  TokenizeResult,
} from "../common/backend";

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


export namespace Backend {
  let _wasm: BackendWasm;

  export async function initialize(): Promise<void> {
    if (BrowserApi.context === "background") {
      return _initialize()
    }
  }

  async function _initialize(): Promise<void> {
    Utils.bench("start")
    const BackendWasmConstructorP = loadWasm();
    const dictionaryP = loadDictionary();
    const [BackendWasmConstructor, [indexBytes, entriesBytes]] = await Promise.all([BackendWasmConstructorP, dictionaryP]);
    Utils.bench("loaded")
    _wasm = new BackendWasmConstructor(indexBytes, entriesBytes);
    Utils.bench("backend created")
  }

  async function loadWasm(): Promise<typeof BackendWasm> {
    // @ts-ignore wasm is string
    const resp = await fetch(wasm);
    await initWasm(resp);

    return BackendWasm;
  }

  async function fetchBytes(url: string): Promise<Uint8Array> {
    const resp = await fetch(url);
    const buffer = await resp.arrayBuffer();
    return new Uint8Array(buffer, 0, buffer.byteLength);
  }

  async function loadDictionary(): Promise<[Uint8Array, Uint8Array]> {
    const db = await openDictionaryDB();
    const yomikiriIndexP = db.get("yomikiri-index", "value");
    const yomikiriEntriesP = db.get("yomikiri-entries", "value");
    const [yomikiriIndexBytes, yomikiriEntriesBytes] = await Promise.all([yomikiriIndexP, yomikiriEntriesP]);
    if (yomikiriIndexBytes !== undefined && yomikiriEntriesBytes !== undefined) {
      return [yomikiriIndexBytes, yomikiriEntriesBytes];
    }

    const defaultIndexP = fetchBytes(ENYomikiriIndex);
    const defaultEntriesP = fetchBytes(ENYomikiridict);
    const [indexBytes, entriesBytes] = await Promise.all([
      defaultIndexP,
      defaultEntriesP,
    ]);
    return [indexBytes, entriesBytes];
  }

  export async function tokenize(text: string, charAt?: number): Promise<TokenizeResult> {
    if (BrowserApi.context !== "background") {
      return BrowserApi.request("tokenize", { text, charAt });
    } else {
      return _tokenize(text, charAt);
    }
  }

  async function _tokenize(text: string, charAt?: number): Promise<TokenizeResult> {
    charAt = charAt ?? 0;

    if (text === "") {
      return TokenizeResult.empty();
    }
    if (charAt < 0 || charAt >= text.length) {
      throw new RangeError(`charAt is out of range: ${charAt}, ${text}`);
    }

    const codePointAt = Utils.toCodePointIndex(text, charAt);

    let rawResult = _wasm.tokenize(text, codePointAt);
    return TokenizeResult.from(rawResult);
  }

  export async function search(term: string): Promise<Entry[]> {
    if (BrowserApi.context !== "background") {
      return BrowserApi.request("searchTerm", term);
    } else {
      return _search(term);
    }
  }

  async function _search(term: string): Promise<Entry[]> {
    const entries = _wasm
      .search(term)
      .map((json) => JSON.parse(json))
      .map(Entry.fromObject);
    Entry.order(entries);
    return entries;
  }

  export async function updateDictionary(): Promise<DictionaryMetadata> {
    const [index_bytes, entries_bytes] = await createNewDictionary()
    const download_date = new Date();
    const metadata: DictionaryMetadata = {
      download_date: download_date.toISOString(),
      files_size: index_bytes.byteLength + entries_bytes.byteLength
    };

    const db = await openDictionaryDB();
    let tx = await db.transaction(["metadata", "yomikiri-index", "yomikiri-entries"], "readwrite");
    tx.objectStore("metadata").put(metadata, "value");
    tx.objectStore("yomikiri-index").put(index_bytes, "value");
    tx.objectStore("yomikiri-entries").put(entries_bytes, "value");
    await tx.done;

    return metadata;
  }

  async function createNewDictionary(): Promise<[Uint8Array, Uint8Array]> {
    const resp = await fetch("http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz")
    const buffer = await resp.arrayBuffer()
    const typedarray = new Uint8Array(buffer);
    return create_dictionary(typedarray);
  }

  async function openDictionaryDB() {
    return await openDB<DictionaryDBSchema>("jmdict", 1, {
      upgrade(db, oldVersion, newVersion, transaction, event) {
        db.createObjectStore("metadata")
        db.createObjectStore("yomikiri-index")
        db.createObjectStore("yomikiri-entries")
      }
    });
  }

}


Backend satisfies IBackend;
