import { type IBackend, TokenizeResult } from "../common/backend";
import { Backend as BackendWasm, dict_schema_ver } from "@yomikiri/yomikiri-rs";
import {
  BackgroundFunction,
  createConnection,
  getStorage,
  handleConnection,
  removeStorage,
  setStorage,
} from "extension/browserApi";

import Utils, {
  LazyAsync,
  PromiseWithProgress,
  createPromise,
  nextTask,
} from "lib/utils";
import { loadDictionary, loadWasm } from "./fetch";
import { EXTENSION_CONTEXT } from "consts";
import { openDictionaryDB } from "./dictionary";
import { YomikiriError } from "lib/error";

export * from "../common/backend";

export namespace DesktopBackend {
  let _wasm: LazyAsync<BackendWasm> | undefined;

  if (EXTENSION_CONTEXT === "background") {
    _wasm = new LazyAsync(() => initializeWasm());
  }

  async function initializeWasm(): Promise<BackendWasm> {
    Utils.bench("start");
    const BackendWasmConstructor = await loadWasm();
    // Must be called after loadWasm()
    const schema_ver = dict_schema_ver();
    const dictBytes = await loadDictionary(schema_ver);
    Utils.bench("loaded");
    const wasm = new BackendWasmConstructor(dictBytes);
    Utils.bench("backend created");
    return wasm;
  }

  export const tokenize = BackgroundFunction(
    "tokenize",
    async ({ text, charAt }) => {
      return _tokenize(await _wasm!.get(), text, charAt);
    },
  );

  function _tokenize(
    wasm: BackendWasm,
    text: string,
    charAt?: number,
  ): TokenizeResult {
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

  export const search = BackgroundFunction(
    "searchTerm",
    async ({ term, charAt }) => {
      return _search(await _wasm!.get(), term, charAt);
    },
  );

  function _search(
    wasm: BackendWasm,
    term: string,
    charAt?: number,
  ): TokenizeResult {
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

  export const getDictCreationDate = BackgroundFunction(
    "getDictCreationDate",
    async () => {
      const wasm = await _wasm!.get();
      return wasm.creation_date();
    },
  );

  /** Returns `false` if already up-to-date. Otherwise, returns `true`. */
  export function updateDictionary(): PromiseWithProgress<boolean, string> {
    if (EXTENSION_CONTEXT === "background") {
      const prom = PromiseWithProgress.fromPromise(
        _updateDictionary(progressFn),
        "Downloading JMDict file...",
      );

      function progressFn(msg: string) {
        prom.setProgress(msg);
      }
      return prom;
    } else {
      const _port = createConnection("updateDictionary");
      const [prom, resolve, reject] = createPromise<boolean>();
      const promWithProgress = PromiseWithProgress.fromPromise<boolean, string>(
        prom,
      );
      let completed = false;
      _port.onMessage.addListener((msg: ConnectionMessage<boolean>) => {
        if (msg.status === "progress") {
          promWithProgress.setProgress(msg.message);
        } else if (msg.status === "success") {
          completed = true;
          resolve(msg.message);
        } else {
          completed = true;
          reject(YomikiriError.from(msg.message));
        }
      });
      _port.onDisconnect.addListener(() => {
        if (!completed) {
          completed = true;
          reject(
            new YomikiriError(
              "Unexpectedly disconnected from background script",
            ),
          );
        }
      });
      return promWithProgress;
    }
  }

  /** Returns `false` if already up-to-date. Otherwise, returns `true`. */
  async function _updateDictionary(
    progressFn: (msg: string) => unknown,
  ): Promise<boolean> {
    const wasm = await _wasm!.get();
    const jmdict_bytes = await fetchDictionary();
    if (jmdict_bytes === false) {
      return false;
    }

    progressFn("Creating dictionary file...");
    await nextTask();
    const { dict_bytes } = wasm.update_dictionary(jmdict_bytes);
    progressFn("Saving dictionary file...");
    await saveDictionaryFile(dict_bytes);
    const dictSchemaVer = dict_schema_ver();
    await setStorage("dict.schema_ver", dictSchemaVer);
    return true;
  }
}

if (EXTENSION_CONTEXT === "background") {
  handleConnection("updateDictionary", (port) => {
    const progress = DesktopBackend.updateDictionary();
    progress.progress.subscribe((prg) => {
      const message: ConnectionMessageProgress = {
        status: "progress",
        message: prg,
      };
      port.postMessage(message);
    });

    progress
      .then((data) => {
        const message: ConnectionMessageSuccess<boolean> = {
          status: "success",
          message: data,
        };
        port.postMessage(message);
      })
      .catch((error: unknown) => {
        const message: ConnectionMessageError = {
          status: "error",
          message: YomikiriError.from(error),
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
  message: YomikiriError;
}

/**
 * Returns `false` if we get '304 NOT MODIFIED' response,
 * which means existing jmdict file is up to date.
 *
 * Otherwise, downloads and returns jmdict file content.
 */
async function fetchDictionary(): Promise<Uint8Array | false> {
  const etag = await getStorage("dict.jmdict.etag");
  const resp = await fetch("http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz", {
    headers: etag ? { "If-None-Match": etag } : {},
  });
  if (resp.status === 304) {
    return false;
  } else {
    const etag = resp.headers.get("ETag");
    if (typeof etag === "string") {
      await setStorage("dict.jmdict.etag", etag);
    } else {
      await removeStorage("dict.jmdict.etag");
    }

    const buffer = await resp.arrayBuffer();
    return new Uint8Array(buffer);
  }
}

async function saveDictionaryFile(dict_bytes: Uint8Array): Promise<void> {
  const db = await openDictionaryDB();
  const tx = db.transaction(["yomikiri-dictionary"], "readwrite");
  await tx.objectStore("yomikiri-dictionary").put(dict_bytes, "value");
  await tx.done;
}

DesktopBackend satisfies IBackend;

export const Backend = DesktopBackend;
