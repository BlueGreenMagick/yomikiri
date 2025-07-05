import {
  BackgroundFunction,
  createConnection,
  getStorage,
  handleConnection,
  type Port,
  removeStorage,
  setStorage,
} from "@/features/extension";
import { Backend as BackendWasm, dict_schema_ver } from "@yomikiri/yomikiri-backend-wasm";
import type {
  DictionaryMetadata,
  IBackend,
  RunArgTypes,
  RunReturnTypes,
  SearchRequest,
  TokenizeRequest,
  TokenizeResult,
} from "../types/backend";

import { YomikiriError } from "@/features/error";
import Utils, { createPromise, LazyAsync, nextTask, PromiseWithProgress } from "@/features/utils";
import { cleanTokenizeResult, emptyTokenizeResult } from "@/platform/shared/backend";
import { Database, type FileName } from "./db";
import { fetchDictionary, loadWasm } from "./fetch";

export class DesktopBackend implements IBackend {
  readonly type = "desktop";

  private constructor(
    private background: DesktopBackendBackground | null,
  ) {}

  static foreground(): DesktopBackend {
    return new DesktopBackend(null);
  }

  static background(background: DesktopBackendBackground): DesktopBackend {
    return new DesktopBackend(background);
  }

  readonly tokenize = BackgroundFunction("tokenize", (req) => this.background!.tokenize(req));

  readonly search = BackgroundFunction("searchTerm", (req) => this.background!.search(req));

  readonly getDictMetadata = BackgroundFunction(
    "getDictMetadata",
    () => this.background!.getDictMetadata(),
  );

  /** Returns `false` if already up-to-date. Otherwise, returns `true`. */
  updateDictionary(): PromiseWithProgress<boolean, string> {
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

/**
 * Must be initialized synchronously on background page load,
 * in order for message and connection handlers to be attached
 */
export class DesktopBackendBackground {
  private _wasm: LazyAsync<BackendWasm> = new LazyAsync(() => this.initializeWasm());

  constructor(private db: LazyAsync<Database>) {
    handleConnection("updateDictionary", (port) => {
      this.updateDictionaryConnection(port);
    });
  }

  private async initializeWasm(): Promise<BackendWasm> {
    Utils.bench("start");
    const BackendWasmConstructor = await loadWasm();
    // Must be called after loadWasm()
    const schema_ver = dict_schema_ver();
    const dictBytes = await this.loadDictionary(schema_ver);
    Utils.bench("loaded");
    const wasm = new BackendWasmConstructor(dictBytes);
    Utils.bench("backend created");
    return wasm;
  }

  private run<C extends keyof RunArgTypes>(
    wasm: BackendWasm,
    cmd: C,
    args: RunArgTypes[C],
  ): RunReturnTypes[C] {
    const jsonResult = wasm.run(cmd, JSON.stringify(args));
    return JSON.parse(jsonResult) as RunReturnTypes[C];
  }

  async tokenize({ text, charAt }: TokenizeRequest): Promise<TokenizeResult> {
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
    const wasm = await this._wasm.get();
    const result = this.run(wasm, "tokenize", args);
    cleanTokenizeResult(result);
    return result;
  }

  async search({ term, charAt }: SearchRequest): Promise<TokenizeResult> {
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
    const wasm = await this._wasm.get();
    const result = this.run(wasm, "search", args);
    cleanTokenizeResult(result);
    return result;
  }

  async getDictMetadata(): Promise<DictionaryMetadata> {
    const wasm = await this._wasm.get();
    return this.run(wasm, "metadata", null);
  }

  private updateDictionaryConnection(port: Port) {
    const progress = this.updateDictionary();

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
  }

  /** Returns `false` if already up-to-date. Otherwise, returns `true`. */
  updateDictionary(): PromiseWithProgress<boolean, string> {
    const progress = PromiseWithProgress.fromPromise(
      this._updateDictionary(progressFn),
      "Updating dictionary...",
    );

    function progressFn(msg: string) {
      progress.setProgress(msg);
    }

    return progress;
  }

  /** Returns `false` if already up-to-date. Otherwise, returns `true`. */
  private async _updateDictionary(
    progressFn: (msg: string) => unknown,
  ): Promise<boolean> {
    const wasm = await this._wasm.get();
    progressFn("Downloading JMdict file...");
    const jmdict_bytes = await this.fetchDictionaryFile(
      "JMdict_e.gz",
      JMDICT_URL,
      "dict.jmdict.etag",
    );
    progressFn("Downloading JMnedict file...");
    const jmnedict_bytes = await this.fetchDictionaryFile(
      "JMnedict.xml.gz",
      JMNEDICT_URL,
      "dict.jmnedict.etag",
    );

    progressFn("Creating dictionary file...");
    await nextTask();
    const { dict_bytes } = wasm.update_dictionary(jmdict_bytes, jmnedict_bytes);
    progressFn("Saving dictionary file...");
    await this.saveDictionaryFile(dict_bytes);
    const dictSchemaVer = dict_schema_ver();
    await setStorage("dict.schema_ver", dictSchemaVer);
    return true;
  }

  private async fetchDictionaryFile(
    filename: FileName,
    url: string,
    etag_key: "dict.jmdict.etag" | "dict.jmnedict.etag",
  ): Promise<Uint8Array> {
    const db = await this.db.get();

    console.log(`Fetching ${filename} at ${url}`);
    const file_exists = await db.files.hasFile(filename);
    const prevEtag = file_exists ? await getStorage(etag_key) : undefined;
    const resp = await fetch(url, {
      headers: prevEtag ? { "If-None-Match": prevEtag } : {},
    });

    if (resp.status === 304) {
      console.log("Will use existing file as it is already up to date");
      const file = await db.files.readFile(filename);
      if (file !== undefined) return file;
      console.log("Existing dictionary file has disappeared.");
    }

    console.log("Saving downloaded file");
    const etag = resp.headers.get("ETag");
    // remove previous etag until file is written to idb
    await removeStorage("dict.jmdict.etag");
    const buffer = await resp.arrayBuffer();
    const content = new Uint8Array(buffer);
    await db.files.writeFile(filename, content);
    if (etag !== null) {
      await setStorage("dict.jmdict.etag", etag);
    }
    return content;
  }

  private async saveDictionaryFile(dict_bytes: Uint8Array): Promise<void> {
    const db = await this.db.get();
    await db.files.writeFiles([["yomikiri-dictionary", dict_bytes]]);
  }

  private async loadDictionary(schemaVer: number): Promise<Uint8Array> {
    const saved = await this.loadSavedDictionary(schemaVer);
    if (saved !== null) {
      return saved;
    }

    return fetchDictionary();
  }

  private async loadSavedDictionary(schemaVer: number): Promise<Uint8Array | null> {
    const user_dict_schema_ver = await getStorage("dict.schema_ver");
    if (user_dict_schema_ver === undefined) {
      return null;
    } else if (user_dict_schema_ver !== schemaVer) {
      await this.deleteSavedDictionary();
      return null;
    } else {
      const db = await this.db.get();
      return await db.files.readFile("yomikiri-dictionary") ?? null;
    }
  }

  async deleteSavedDictionary() {
    const db = await this.db.get();
    console.info("Will delete user-installed dictionary");
    await db.files.deleteFiles(["yomikiri-dictionary"]);
    await removeStorage("dict.schema_ver");
    await removeStorage("dict.jmdict.etag");
    console.info("Deleted user-installed dictionary");
  }
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
