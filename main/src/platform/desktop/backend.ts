import { type IBackend, TokenizeResult } from "../common/backend";
import {
  Backend as BackendWasm,
  type DictMetadata,
} from "@yomikiri/yomikiri-rs";
import {
  createConnection,
  handleConnection,
  message,
} from "extension/browserApi";

import Utils, {
  LazyAsync,
  PromiseWithProgress,
  createPromise,
  getErrorMessage,
  nextTask,
} from "lib/utils";
import { loadDictionary, loadWasm } from "./fetch";
import { EXTENSION_CONTEXT } from "consts";
import { openDictionaryDB } from "./dictionary";

export * from "../common/backend";

export class DesktopBackend implements IBackend {
  wasm?: BackendWasm;

  static instance: LazyAsync<DesktopBackend> = new LazyAsync(() => {
    return DesktopBackend.initialize();
  });

  private static async initialize(): Promise<DesktopBackend> {
    const backend = new DesktopBackend();
    if (EXTENSION_CONTEXT === "background") {
      await backend._initialize();
    }
    return backend;
  }

  private constructor() {}

  async _initialize(): Promise<void> {
    Utils.bench("start");
    const BackendWasmConstructorP = loadWasm();
    const dictionaryP = loadDictionary();
    const [BackendWasmConstructor, [indexBytes, entriesBytes]] =
      await Promise.all([BackendWasmConstructorP, dictionaryP]);
    Utils.bench("loaded");
    this.wasm = new BackendWasmConstructor(indexBytes, entriesBytes);
    Utils.bench("backend created");
  }

  async tokenize(text: string, charAt?: number): Promise<TokenizeResult> {
    if (this.wasm === undefined) {
      return message("tokenize", { text, charAt });
    } else {
      return this._tokenize(this.wasm, text, charAt);
    }
  }

  _tokenize(wasm: BackendWasm, text: string, charAt?: number): TokenizeResult {
    charAt = charAt ?? 0;

    if (text === "") {
      return TokenizeResult.empty();
    }
    if (charAt < 0 || charAt >= text.length) {
      throw new RangeError(`charAt is out of range: ${charAt}, ${text}`);
    }

    const codePointAt = Utils.toCodePointIndex(text, charAt);

    const rawResult = wasm.tokenize(text, codePointAt);
    return TokenizeResult.from(rawResult);
  }

  async search(term: string, charAt?: number): Promise<TokenizeResult> {
    if (this.wasm === undefined) {
      return message("searchTerm", { term, charAt });
    } else {
      return this._search(this.wasm, term, charAt);
    }
  }

  _search(wasm: BackendWasm, term: string, charAt?: number): TokenizeResult {
    charAt = charAt ?? 0;
    if (term === "") {
      return TokenizeResult.empty();
    }
    if (charAt < 0 || charAt >= term.length) {
      throw new RangeError(`charAt is out of range: ${charAt}, ${term}`);
    }

    const codePointAt = Utils.toCodePointIndex(term, charAt);
    const rawResult = wasm.search(term, codePointAt);
    return TokenizeResult.from(rawResult);
  }

  updateDictionary(): Utils.PromiseWithProgress<DictMetadata, string> {
    if (EXTENSION_CONTEXT === "background") {
      const prom = PromiseWithProgress.fromPromise(
        _updateDictionary(this.wasm!, progressFn),
        "Downloading JMDict file...",
      );

      function progressFn(msg: string) {
        prom.setProgress(msg);
      }
      return prom;
    } else {
      const _port = createConnection("updateDictionary");
      const [prom, resolve, reject] = createPromise<DictMetadata>();
      const promWithProgress = PromiseWithProgress.fromPromise<
        DictMetadata,
        string
      >(prom);
      let completed = false;
      _port.onMessage.addListener((msg: ConnectionMessage<DictMetadata>) => {
        if (msg.status === "progress") {
          promWithProgress.setProgress(msg.message);
        } else if (msg.status === "success") {
          completed = true;
          resolve(msg.message);
        } else {
          completed = true;
          reject(new Error(msg.message));
        }
      });
      _port.onDisconnect.addListener(() => {
        if (!completed) {
          completed = true;
          reject(new Error("Unexpectedly disconnected from background script"));
        }
      });
      return promWithProgress;
    }
  }
}

if (EXTENSION_CONTEXT === "background") {
  handleConnection("updateDictionary", async (port) => {
    const backend = await DesktopBackend.instance.get();
    const progress = backend.updateDictionary();
    progress.progress.subscribe((prg) => {
      const message: ConnectionMessageProgress = {
        status: "progress",
        message: prg,
      };
      port.postMessage(message);
    });

    progress
      .then((metadata) => {
        const message: ConnectionMessageSuccess<DictMetadata> = {
          status: "success",
          message: metadata,
        };
        port.postMessage(message);
      })
      .catch((error: unknown) => {
        const message: ConnectionMessageError = {
          status: "error",
          message: getErrorMessage(error),
        };
        port.postMessage(message);
      });
  });
}

type ConnectionMessage<T> =
  | ConnectionMessageProgress
  | ConnectionMessageSuccess<T>
  | ConnectionMessageError;

interface ConnectionMessageProgress {
  status: "progress";
  message: string;
}

interface ConnectionMessageSuccess<T> {
  status: "success";
  message: T;
}

interface ConnectionMessageError {
  status: "error";
  message: string;
}

async function _updateDictionary(
  wasm: BackendWasm,
  progressFn: (msg: string) => unknown,
): Promise<DictMetadata> {
  const jmdict_bytes = await fetchDictionary();
  progressFn("Creating dictionary file...");
  await nextTask();
  const { index_bytes, entry_bytes, metadata } =
    wasm.update_dictionary(jmdict_bytes);
  progressFn("Saving dictionary file...");
  await saveDictionaryFile(index_bytes, entry_bytes, metadata);
  return metadata;
}

async function fetchDictionary(): Promise<Uint8Array> {
  const resp = await fetch("http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz");
  const buffer = await resp.arrayBuffer();
  return new Uint8Array(buffer);
}

async function saveDictionaryFile(
  index_bytes: Uint8Array,
  entries_bytes: Uint8Array,
  metadata: DictMetadata,
): Promise<void> {
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
}

export const Backend = DesktopBackend;
export type Backend = DesktopBackend;
