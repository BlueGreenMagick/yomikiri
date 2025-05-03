import type {
  AnkiInfo,
  IAnkiAddNotes,
  IAnkiOptions,
  NotetypeInfo,
} from "../common/anki";
import Config from "@/features/config";
import type { AnkiNote } from "@/features/anki";
import {
  getStorage,
  NonContentScriptFunction,
  removeStorage,
  setStorage,
} from "@/features/extension/browserApi";
import {
  PromiseWithProgress,
  SingleQueued,
  createPromise,
  getErrorMessage,
  type First,
  type Second,
} from "@/features/utils";

export * from "../common/anki";

const ANKI_CONNECT_VER = 6;

interface AnkiConnectSuccess<T> {
  result: T;
  error: null;
}

interface AnkiConnectFail {
  result: null;
  error: string;
}

type AnkiConnectResponse<T> = AnkiConnectSuccess<T> | AnkiConnectFail;

interface AnkiConnectPermission {
  permission: "granted" | "denied";
}

interface AnkiConnectModelFieldNamesParams {
  modelName: string;
}

interface AnkiConnectNoteAttachment {
  url: string;
  filename: string;
  skipHash: string;
  fields: string[];
}

interface AnkiConnectNote {
  deckName: string;
  modelName: string;
  fields: Record<string, string>;
  tags?: string[] | null;
  audio?: AnkiConnectNoteAttachment | AnkiConnectNoteAttachment[] | null;
  video?: AnkiConnectNoteAttachment | AnkiConnectNoteAttachment[] | null;
  picture?: AnkiConnectNoteAttachment | AnkiConnectNoteAttachment[] | null;
  options?: {
    allowDuplicate?: boolean | null;
    duplicateScope?: "deck" | null;
    duplicateScopeDeckName?: {
      deckName?: string | null;
      checkChildren: boolean;
      checkAllModels: boolean;
    } | null;
  } | null;
}

interface AnkiConnectAddNoteParams {
  note: AnkiConnectNote;
}

export interface AnkiConnectRequestMap {
  deckNames: [never, string[]];
  modelNames: [never, string[]];
  modelFieldNames: [AnkiConnectModelFieldNamesParams, string[]];
  getTags: [never, string[]];
  addNote: [AnkiConnectAddNoteParams, void];
  requestPermission: [never, AnkiConnectPermission];
}

export class AnkiError extends Error {}

export class AnkiConnectionError extends AnkiError {
  constructor() {
    super(
      "Failed to connect to Anki. Please check that Anki is running and AnkiConnect add-on is configured correctly.",
    );
  }
}

export class AnkiConnectPermissionError extends AnkiError {
  constructor() {
    super("AnkiConnect did not allow this app to use its api.");
  }
}

/** Anki-connect response format is not supported */
export class InvalidAnkiResponseFormatError extends AnkiError {}

/** Anki-connect response was an error */
export class AnkiConnectError extends AnkiError {}

export namespace DesktopAnkiApi {
  export const IS_DESKTOP = true;
  export const IS_IOS = false;
  export const IS_IOSAPP = false;
  export const IS_ANDROID = false;

  function ankiConnectURL(config: Config): string {
    let url = config.get("anki.connect_url");
    const port = config.get("anki.connect_port");
    if (!url.includes("://")) {
      url = "http://" + url;
    }
    return `${url}:${port}`;
  }

  /**
   * Send Anki-connect request.
   * Must not be called from content script.
   */
  async function request<K extends keyof AnkiConnectRequestMap>(
    action: K,
    params?: First<AnkiConnectRequestMap[K]>,
  ): Promise<Second<AnkiConnectRequestMap[K]>> {
    const config = await Config.instance.get();
    const ankiConnectUrl = ankiConnectURL(config);
    let response;
    try {
      response = await fetch(ankiConnectUrl, {
        method: "POST",
        body: JSON.stringify({
          action,
          version: ANKI_CONNECT_VER,
          params,
        }),
      });
    } catch (e) {
      throw new AnkiConnectionError();
    }

    const data = (await response.json()) as AnkiConnectResponse<
      Second<AnkiConnectRequestMap[K]>
    >;

    if (Object.getOwnPropertyNames(data).length != 2) {
      throw new InvalidAnkiResponseFormatError(
        "response has an unexpected number of fields",
      );
    }
    if (!Object.prototype.hasOwnProperty.call(data, "error")) {
      throw new InvalidAnkiResponseFormatError(
        "response is missing required error field",
      );
    }
    if (!Object.prototype.hasOwnProperty.call(data, "result")) {
      throw new InvalidAnkiResponseFormatError(
        "response is missing required result field",
      );
    }
    if (data.error !== null) {
      throw new AnkiConnectError(data.error);
    } else {
      return data.result;
    }
  }

  export async function getAnkiInfo(): Promise<AnkiInfo> {
    return fetchAnkiInfo();
  }

  export async function requestAnkiInfo(): Promise<void> {
    await checkConnection();
  }

  async function fetchAnkiInfo(): Promise<AnkiInfo> {
    const decks = await request("deckNames");
    const notetypes = await request("modelNames");
    const ankiInfo: AnkiInfo = {
      decks,
      notetypes: [],
    };
    for (const notetype of notetypes) {
      const fields = await notetypeFields(notetype);
      const notetypeInfo: NotetypeInfo = {
        name: notetype,
        fields: fields,
      };
      ankiInfo.notetypes.push(notetypeInfo);
    }
    return ankiInfo;
  }

  export async function notetypeFields(
    noteTypeName: string,
  ): Promise<string[]> {
    return await request("modelFieldNames", {
      modelName: noteTypeName,
    });
  }

  export async function tags(): Promise<string[]> {
    return await request("getTags");
  }

  export const addNote = NonContentScriptFunction("addAnkiNote", _addNote);

  async function _addNote(
    note: AnkiNote,
    deferrable: boolean = true,
  ): Promise<boolean> {
    const fields: Record<string, string> = {};
    for (const field of note.fields) {
      fields[field.name] = field.value;
    }
    try {
      await request("addNote", {
        note: {
          deckName: note.deck,
          modelName: note.notetype,
          fields: fields,
          tags: note.tags.split(" "),
          options: {
            allowDuplicate: true,
          },
        },
      });
      return true;
    } catch (err: unknown) {
      const config = await Config.instance.get();
      if (
        deferrable &&
        err instanceof AnkiConnectionError &&
        config.get("anki.defer_notes")
      ) {
        await deferNote(note);
        return false;
      } else {
        console.error(err);
        throw err;
      }
    }
  }

  async function deferNote(note: AnkiNote) {
    const existingNotes: AnkiNote[] = await getStorage(
      "deferred-anki-note",
      [],
    );
    existingNotes.push(note);
    await setDeferredNotes(existingNotes);
  }

  /** Throws an error if not successfully connected. */
  export async function checkConnection(): Promise<void> {
    const resp = await request("requestPermission");
    if (resp.permission === "granted") {
      return;
    } else {
      throw new AnkiConnectPermissionError();
    }
  }

  /**
   * If there are deferred notes, add to Anki.
   *
   * If failed to add a note, save the error message to config
   * and continue to next note.
   *
   * Resets stored error messages.
   *
   * Returns null if deferred notes are currently being added, and another request is queued.
   */
  export const addDeferredNotes = SingleQueued(_addDeferredNotes);

  export type AddDeferredNotesProgress = "loading" | number;

  function _addDeferredNotes(): PromiseWithProgress<
    void,
    AddDeferredNotesProgress
  > {
    const [innerPromise, resolve, reject] = createPromise<void>();
    const promise: PromiseWithProgress<void, AddDeferredNotesProgress> =
      PromiseWithProgress.fromPromise(innerPromise, "loading");

    (async () => {
      const config = await Config.instance.get();
      const noteCount = config.get("state.anki.deferred_note_count");

      if (noteCount === 0) {
        resolve();
        return;
      }

      promise.setProgress(noteCount);
      await setStorage("deferred-anki-note-errors", []);
      await config.set("state.anki.deferred_note_error", false);

      const deferredNotes = await getStorage("deferred-anki-note", []);
      const errorMessages: string[] = [];

      // don't remove notes that failed to be added to Anki.
      let i = 0;
      while (i < deferredNotes.length) {
        const note = deferredNotes[i];
        try {
          await _addNote(note, false);
          deferredNotes.splice(i, 1);
          await setDeferredNotes(deferredNotes, config);
        } catch (err: unknown) {
          if (err instanceof AnkiConnectError) {
            errorMessages.push(getErrorMessage(err));
            await setStorage("deferred-anki-note-errors", errorMessages);
            await config.set("state.anki.deferred_note_error", true);
            i += 1;
          } else {
            break;
          }
        } finally {
          promise.setProgress(deferredNotes.length - i);
        }
      }
    })()
      .then(() => {
        resolve();
      })
      .catch((err: unknown) => {
        reject(err);
      });
    return promise;
  }

  /**
   * Deletes all deferred notes and error messages from storage.
   * Returns a job object that you can undo.
   */
  export async function clearDeferredNotes(): Promise<ClearDeferredNotesJob> {
    const config = await Config.instance.get();
    return ClearDeferredNotesJob.run(config);
  }

  export async function getDeferredNotesErrorMessages(): Promise<string[]> {
    return await getStorage("deferred-anki-note-errors", []);
  }

  async function setDeferredNotes(notes: AnkiNote[], config?: Config) {
    await setStorage("deferred-anki-note", notes);
    if (!config) {
      config = await Config.instance.get();
    }
    await config.set("state.anki.deferred_note_count", notes.length);
  }
}

/**
 * This job clears saved deferred notes. It can be undone by calling `.undo()`.
 */
export class ClearDeferredNotesJob {
  notes: AnkiNote[];
  errors: string[];
  config: Config;

  private constructor(config: Config, notes: AnkiNote[], errors: string[]) {
    this.config = config;
    this.notes = notes;
    this.errors = errors;
  }

  static async run(config: Config): Promise<ClearDeferredNotesJob> {
    const notes = (await getStorage("deferred-anki-note")) ?? [];
    const errors = (await getStorage("deferred-anki-note-errors")) ?? [];

    await config.setBatch({
      "state.anki.deferred_note_count": 0,
      "state.anki.deferred_note_error": false,
    });
    await removeStorage("deferred-anki-note-errors");
    await removeStorage("deferred-anki-note");
    return new ClearDeferredNotesJob(config, notes, errors);
  }

  async undo() {
    await setStorage("deferred-anki-note", this.notes);
    await setStorage("deferred-anki-note-errors", this.errors);
    await this.config.setBatch({
      "state.anki.deferred_note_count": this.notes.length,
      "state.anki.deferred_note_error": this.errors.length > 0,
    });
  }
}

DesktopAnkiApi satisfies IAnkiOptions;
DesktopAnkiApi satisfies IAnkiAddNotes;

export type DesktopAnkiApi = typeof DesktopAnkiApi;
export const AnkiApi = DesktopAnkiApi;
