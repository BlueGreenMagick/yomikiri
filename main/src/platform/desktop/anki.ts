import type { AnkiInfo, AnkiNote, NotetypeInfo } from "@/features/anki";
import { Config } from "@/features/config";
import { YomikiriError } from "@/features/error";
import {
  getStorage,
  NonContentScriptFunction,
  removeStorage,
  setStorage,
} from "@/features/extension";
import {
  DeferredWithProgress,
  type First,
  getErrorMessage,
  LazyAsync,
  type Second,
  SingleQueued,
} from "@/features/utils";
import type { IAnkiAddNotes, IAnkiOptions } from "../types/anki";

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

type AddDeferredNotesProgress = "loading" | number;

/** Must be initialized synchronously on page load */
export class DesktopAnkiApi implements IAnkiOptions, IAnkiAddNotes {
  readonly type = "desktop";
  readonly lazyConfig: LazyAsync<Config>;

  constructor(lazyConfig: LazyAsync<Config>) {
    this.lazyConfig = lazyConfig;
  }

  /**
   * Send Anki-connect request.
   * Must not be called from content script.
   */
  private async request<K extends keyof AnkiConnectRequestMap>(
    action: K,
    params?: First<AnkiConnectRequestMap[K]>,
  ): Promise<Second<AnkiConnectRequestMap[K]>> {
    const config = await this.lazyConfig.get();
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
    } catch (_e) {
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

  getAnkiInfo(): Promise<AnkiInfo> {
    return this.fetchAnkiInfo();
  }

  async requestAnkiInfo(): Promise<void> {
    await this.checkConnection();
  }

  private async fetchAnkiInfo(): Promise<AnkiInfo> {
    const decks = await this.request("deckNames");
    const notetypes = await this.request("modelNames");
    const ankiInfo: AnkiInfo = {
      decks,
      notetypes: [],
    };
    for (const notetype of notetypes) {
      const fields = await this.notetypeFields(notetype);
      const notetypeInfo: NotetypeInfo = {
        name: notetype,
        fields: fields,
      };
      ankiInfo.notetypes.push(notetypeInfo);
    }
    return ankiInfo;
  }

  async notetypeFields(noteTypeName: string): Promise<string[]> {
    return await this.request("modelFieldNames", {
      modelName: noteTypeName,
    });
  }

  async tags(): Promise<string[]> {
    return await this.request("getTags");
  }

  readonly addNote = NonContentScriptFunction(
    "DesktopAnkiApi.addNote",
    this._addNote.bind(this),
  );

  private async _addNote(
    note: AnkiNote,
    deferrable: boolean = true,
  ): Promise<boolean> {
    const fields: Record<string, string> = {};
    for (const field of note.fields) {
      fields[field.name] = field.value;
    }
    try {
      await this.request("addNote", {
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
      const config = await this.lazyConfig.get();
      if (
        deferrable &&
        err instanceof AnkiConnectionError &&
        config.get("anki.defer_notes")
      ) {
        await this.deferNote(note);
        return false;
      } else {
        console.error(err);
        throw err;
      }
    }
  }

  private async deferNote(note: AnkiNote) {
    const existingNotes: AnkiNote[] = await getStorage(
      "deferred-anki-note",
      [],
    );
    existingNotes.push(note);
    await this.setDeferredNotes(existingNotes);
  }

  /** Throws an error if not successfully connected. */
  async checkConnection(): Promise<void> {
    const resp = await this.request("requestPermission");
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
  readonly addDeferredNotes = SingleQueued(this._addDeferredNotes.bind(this));

  private _addDeferredNotes(): DeferredWithProgress<
    void,
    AddDeferredNotesProgress
  > {
    const promise = DeferredWithProgress.create<void, AddDeferredNotesProgress>(
      "loading",
    );

    (async () => {
      const config = await this.lazyConfig.get();
      const noteCount = config.get("state.anki.deferred_note_count");

      if (noteCount === 0) {
        promise.resolve();
        return;
      }

      await promise.setProgress(noteCount);
      await setStorage("deferred-anki-note-errors", []);
      await config.set("state.anki.deferred_note_error", false);

      const deferredNotes = await getStorage("deferred-anki-note", []);
      const errorMessages: string[] = [];

      // don't remove notes that failed to be added to Anki.
      let i = 0;
      while (i < deferredNotes.length) {
        const note = deferredNotes[i];
        try {
          await this._addNote(note, false);
          deferredNotes.splice(i, 1);
          await this.setDeferredNotes(deferredNotes, config);
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
          await promise.setProgress(deferredNotes.length - i);
        }
      }
    })()
      .then(() => {
        promise.resolve();
      })
      .catch((err: unknown) => {
        promise.reject(YomikiriError.from(err));
      });
    return promise;
  }

  /**
   * Deletes all deferred notes and error messages from storage.
   * Returns a job object that you can undo.
   */

  async clearDeferredNotes(): Promise<ClearDeferredNotesJob> {
    const config = await this.lazyConfig.get();
    return ClearDeferredNotesJob.run(config);
  }

  async getDeferredNotesErrorMessages(): Promise<string[]> {
    return await getStorage("deferred-anki-note-errors", []);
  }

  private async setDeferredNotes(notes: AnkiNote[], config?: Config) {
    await setStorage("deferred-anki-note", notes);
    if (!config) {
      config = await this.lazyConfig.get();
    }
    await config.set("state.anki.deferred_note_count", notes.length);
  }
}

function ankiConnectURL(config: Config): string {
  let url = config.get("anki.connect_url");
  const port = config.get("anki.connect_port");
  if (!url.includes("://")) {
    url = "http://" + url;
  }
  return `${url}:${port}`;
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
