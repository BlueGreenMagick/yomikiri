import type {
  IBackend,
  RunArgTypes,
  RunReturnTypes,
  TokenizeResult,
} from "../common/backend";
import {
  Backend as BackendWasm,
  dict_schema_ver,
} from "@yomikiri/yomikiri-backend-wasm";
import {
  BackgroundFunction,
  createConnection,
  getStorage,
  handleConnection,
  removeStorage,
  setStorage,
} from "@/lib/extension/browserApi";

import Utils, {
  LazyAsync,
  PromiseWithProgress,
  createPromise,
  nextTask,
} from "@/lib/utils";
import { loadDictionary, loadWasm } from "./fetch";
import { EXTENSION_CONTEXT } from "consts";
import { YomikiriError } from "@/lib/error";
import {
  cleanTokenizeResult,
  emptyTokenizeResult,
} from "@/platform/shared/backend";
import {
  idbHasFile,
  idbReadFile,
  idbWriteFile,
  idbWriteFiles,
  type FileName,
} from "./idb";

export * from "../common/backend";

export namespace DesktopBackend {
  export const IS_DESKTOP = true;
  export const IS_IOS = false;
  export const IS_IOSAPP = false;

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

  function _run<C extends keyof RunArgTypes>(
    wasm: BackendWasm,
    cmd: C,
    args: RunArgTypes[C],
  ): RunReturnTypes[C] {
    const jsonResult = wasm.run(cmd, JSON.stringify(args));
    return JSON.parse(jsonResult) as RunReturnTypes[C];
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
      return emptyTokenizeResult();
    }
    if (charAt < 0 || charAt >= text.length) {
      throw new RangeError(`charAt is out of range: ${charAt}, ${text}`);
    }

    const codePointAt = Utils.toCodePointIndex(text, charAt);

    const args = {
      sentence: text,
      char_idx: codePointAt,
    };
    const result = _run(wasm, "tokenize", args);
    cleanTokenizeResult(result);
    return result;
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
      return emptyTokenizeResult();
    }
    if (charAt < 0 || charAt >= term.length) {
      throw new RangeError(`charAt is out of range: ${charAt}, ${term}`);
    }

    const codePointAt = Utils.toCodePointIndex(term, charAt);
    const args = {
      query: term,
      char_idx: codePointAt,
    };
    const result = _run(wasm, "search", args);
    cleanTokenizeResult(result);
    return result;
  }

  export const getDictMetadata = BackgroundFunction(
    "getDictMetadata",
    async () => {
      const wasm = await _wasm!.get();
      return _run(wasm, "metadata", null);
    },
  );

  /** Returns `false` if already up-to-date. Otherwise, returns `true`. */
  export function updateDictionary(): PromiseWithProgress<boolean, string> {
    if (EXTENSION_CONTEXT === "background") {
      const prom = PromiseWithProgress.fromPromise(
        _updateDictionary(progressFn),
        "Updating dictionary...",
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
    progressFn("Downloading JMdict file...");
    const jmdict_bytes = await fetchDictionaryFile(
      "JMdict_e.gz",
      JMDICT_URL,
      "dict.jmdict.etag",
    );
    progressFn("Downloading JMnedict file...");
    const jmnedict_bytes = await fetchDictionaryFile(
      "JMnedict.xml.gz",
      JMNEDICT_URL,
      "dict.jmnedict.etag",
    );

    progressFn("Creating dictionary file...");
    await nextTask();
    const { dict_bytes } = wasm.update_dictionary(jmdict_bytes, jmnedict_bytes);
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

const JMDICT_URL = "http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz";
const JMNEDICT_URL = "http://ftp.edrdg.org/pub/Nihongo/JMnedict.xml.gz";

async function fetchDictionaryFile(
  filename: FileName,
  url: string,
  etag_key: "dict.jmdict.etag" | "dict.jmnedict.etag",
): Promise<Uint8Array> {
  console.log(`Fetching ${filename} at ${url}`);
  const file_exists = await idbHasFile(filename);
  const etag = file_exists ? await getStorage(etag_key) : undefined;
  const resp = await fetch(url, {
    headers: etag ? { "If-None-Match": etag } : {},
  });

  if (resp.status === 304) {
    console.log("Will use existing file as it is already up to date");
    return (await idbReadFile(filename)) as Uint8Array;
  } else {
    console.log("Saving downloaded file");
    const etag = resp.headers.get("ETag");
    // remove previous etag until file is written to idb
    await removeStorage("dict.jmdict.etag");
    const buffer = await resp.arrayBuffer();
    const content = new Uint8Array(buffer);
    await idbWriteFile(filename, content);
    if (etag !== null) {
      await setStorage("dict.jmdict.etag", etag);
    }
    return content;
  }
}

async function saveDictionaryFile(dict_bytes: Uint8Array): Promise<void> {
  await idbWriteFiles([["yomikiri-dictionary", dict_bytes]]);
}

DesktopBackend satisfies IBackend;

export const Backend = DesktopBackend;
