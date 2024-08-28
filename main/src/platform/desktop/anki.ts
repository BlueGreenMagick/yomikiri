import type {
  AnkiInfo,
  IAnkiAddNotes,
  IAnkiOptions,
  NotetypeInfo,
} from "../common/anki";
import Config from "lib/config";
import type { AnkiNote } from "lib/anki";
import {
  getStorage,
  message,
  removeStorage,
  setStorage,
} from "extension/browserApi";
import {
  PromiseWithProgress,
  SingleQueued,
  createPromise,
  getErrorMessage,
  type First,
  type Second,
} from "lib/utils";
import { EXTENSION_CONTEXT } from "consts";

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

/**
 * Uses Anki-Connect on desktop.
 * Should not be used in content script
 * as Anki-connect allows only calls from trusted origins.
 */
export class DesktopAnkiApi implements IAnkiAddNotes, IAnkiOptions {
  config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  private ankiConnectURL(): string {
    let url = this.config.get("anki.connect_url");
    const port = this.config.get("anki.connect_port");
    if (!url.includes("://")) {
      url = "http://" + url;
    }
    return `${url}:${port}`;
  }

  /** Send Anki-connect request */
  private async request<K extends keyof AnkiConnectRequestMap>(
    action: K,
    params?: First<AnkiConnectRequestMap[K]>,
  ): Promise<Second<AnkiConnectRequestMap[K]>> {
    const ankiConnectUrl = this.ankiConnectURL();
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

  async getAnkiInfo(): Promise<AnkiInfo> {
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

  async addNote(note: AnkiNote): Promise<boolean> {
    if (EXTENSION_CONTEXT === "contentScript") {
      return message("addAnkiNote", note);
    } else {
      return this._addNote(note);
    }
  }

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
      if (
        deferrable &&
        err instanceof AnkiConnectionError &&
        this.config.get("anki.defer_notes")
      ) {
        await this.deferNote(note);
        return false;
      } else {
        console.error(err);
        throw err;
      }
    }
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

  private async deferNote(note: AnkiNote) {
    const existingNotes: AnkiNote[] = await getStorage(
      "deferred-anki-note",
      [],
    );
    existingNotes.push(note);
    await this.setDeferredNotes(existingNotes);
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
  addDeferredNotes = SingleQueued(() => this.processDeferredNotes());

  /**
   * Deletes all deferred notes and error messages from storage.
   * Returns a job object that you can undo.
   */
  async clearDeferredNotes(): Promise<ClearDeferredNotesJob> {
    return ClearDeferredNotesJob.run(this.config);
  }

  async getDeferredNotesErrorMessages(): Promise<string[]> {
    return await getStorage("deferred-anki-note-errors", []);
  }

  private processDeferredNotes(): PromiseWithProgress<void, number> {
    const noteCount = this.config.get("state.anki.deferred_note_count");

    const [innerPromise, resolve, reject] = createPromise<void>();
    const promise = PromiseWithProgress.fromPromise<void, number>(
      innerPromise,
      noteCount,
    );

    if (noteCount === 0) {
      resolve();
      return promise;
    }

    (async () => {
      await setStorage("deferred-anki-note-errors", []);
      await this.config.set("state.anki.deferred_note_error", false);

      const deferredNotes = await getStorage("deferred-anki-note", []);
      const errorMessages: string[] = [];

      // don't remove notes that failed to be added to Anki.
      let i = 0;
      while (i < deferredNotes.length) {
        const note = deferredNotes[i];
        try {
          await this._addNote(note, false);
          deferredNotes.splice(i, 1);
          await this.setDeferredNotes(deferredNotes);
        } catch (err: unknown) {
          if (err instanceof AnkiConnectError) {
            errorMessages.push(getErrorMessage(err));
            await setStorage("deferred-anki-note-errors", errorMessages);
            await this.config.set("state.anki.deferred_note_error", true);
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

  private async setDeferredNotes(notes: AnkiNote[]) {
    await setStorage("deferred-anki-note", notes);
    await this.config.set("state.anki.deferred_note_count", notes.length);
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

export const AnkiApi = DesktopAnkiApi;
export type AnkiApi = DesktopAnkiApi;
