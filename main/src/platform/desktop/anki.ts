import type {
  AnkiInfo,
  IAnkiAddNotes,
  IAnkiOptions,
  NotetypeInfo,
} from "../common/anki";
import Config from "lib/config";
import type { AnkiNote } from "lib/anki";
import { BrowserApi } from "extension/browserApi";
import type { DesktopPlatform } from ".";
import {
  PromiseWithProgress,
  createPromise,
  getErrorMessage,
  type First,
  type Second,
} from "lib/utils";

const ANKI_CONNECT_VER = 6;
const DEFER_NOTES_STORAGE_KEY = "deferred-anki-note";
const DEFER_ERRORS_STORAGE_KEY = "deferred-anki-note-errors";

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
  platform: DesktopPlatform;
  browserApi: BrowserApi;
  config: Config;

  constructor(platform: DesktopPlatform, config: Config) {
    this.platform = platform;
    this.browserApi = platform.browserApi;
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
      console.error(e);
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

  async addNote(note: AnkiNote): Promise<void> {
    if (this.browserApi.context === "contentScript") {
      return this.browserApi.request("addAnkiNote", note);
    }

    const fields: Record<string, string> = {};
    for (const field of note.fields) {
      fields[field.name] = field.value;
    }
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
    const existingNotes: AnkiNote[] = await this.browserApi.getStorage(
      DEFER_NOTES_STORAGE_KEY,
      [],
    );
    existingNotes.push(note);
    await this.setDeferredNotes(existingNotes);
  }

  /**
   * Add deferred notes to Anki.
   *
   * If failed to add a note, save the error message to config
   * and continue to next note
   *
   */
  private addDeferredNotes(): PromiseWithProgress<void, number> {
    const noteCount = this.config.get("state.anki.deferred_note_count");

    const [innerPromise, resolve, reject] = createPromise<void>();
    const promise = PromiseWithProgress.fromPromise<void, number>(
      innerPromise,
      noteCount,
    );

    (async () => {
      const deferredNotes = await this.browserApi.getStorage<AnkiNote[]>(
        DEFER_NOTES_STORAGE_KEY,
        [],
      );
      const errorMessages: string[] = [];

      // don't remove notes that failed to be added to Anki.
      let i = 0;
      while (i < deferredNotes.length) {
        const note = deferredNotes[i];
        try {
          await this.addNote(note);
          deferredNotes.splice(i, 1);
          await this.setDeferredNotes(deferredNotes);
        } catch (err: unknown) {
          errorMessages.push(getErrorMessage(err));
          await this.browserApi.setStorage(
            DEFER_ERRORS_STORAGE_KEY,
            errorMessages,
          );
          await this.config.set("state.anki.deferred_note_error", true);
          i += 1;
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
    await this.browserApi.setStorage(DEFER_NOTES_STORAGE_KEY, notes);
    await this.config.set("state.anki.deferred_note_count", notes.length);
  }
}

export const AnkiApi = DesktopAnkiApi;
export type AnkiApi = DesktopAnkiApi;
