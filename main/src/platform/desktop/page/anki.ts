import type { AnkiInfo, AnkiNote, NotetypeInfo } from "@/features/anki";
import type { Config } from "@/features/config";
import { getStorage, setStorage } from "@/features/extension";
import {
  type First,
  getErrorMessage,
  type LazyAsync,
  ProgressTask,
  type Second,
} from "@/features/utils";
import type { AnkiAddNoteReq } from "@/platform/types/anki";

const ANKI_CONNECT_VER = 6;

type AddDeferredNotesProgress = "loading" | number;

type AddDeferredNotesProgressTask = ProgressTask<
  void,
  AddDeferredNotesProgress
>;

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

/** This class can be used in extension page and background context. */
export class DesktopAnkiApiPage {
  constructor(private lazyConfig: LazyAsync<Config>) {}

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

  /** Throws an error if not successfully connected. */
  async checkConnection(): Promise<void> {
    const resp = await this.request("requestPermission");
    if (resp.permission === "granted") {
      return;
    } else {
      throw new AnkiConnectPermissionError();
    }
  }

  async getAnkiInfo(): Promise<AnkiInfo> {
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

  async addNote(
    { note, deferrable = true }: AnkiAddNoteReq,
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

  private _addDeferredNotesInProgress: AddDeferredNotesProgressTask | null = null;

  addDeferredNotes() {
    if (this._addDeferredNotesInProgress === null) {
      this._addDeferredNotesInProgress = this._addDeferredNotes();
      void this._addDeferredNotesInProgress.promise.finally(() => {
        this._addDeferredNotesInProgress = null;
      });
    }
    return this._addDeferredNotesInProgress;
  }

  private _addDeferredNotes(): ProgressTask<
    void,
    AddDeferredNotesProgress
  > {
    return new ProgressTask<void, AddDeferredNotesProgress>(
      "loading",
      async (setProgress) => {
        const config = await this.lazyConfig.get();
        const noteCount = config.get("state.anki.deferred_note_count");

        if (noteCount === 0) {
          return;
        }

        await setProgress(noteCount);
        await setStorage("deferred-anki-note-errors", []);
        await config.set("state.anki.deferred_note_error", false);

        const deferredNotes = await getStorage("deferred-anki-note", []);
        const errorMessages: string[] = [];

        // don't remove notes that failed to be added to Anki.
        let i = 0;
        while (i < deferredNotes.length) {
          const note = deferredNotes[i];
          try {
            await this.addNote({ note, deferrable: false });
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
            await setProgress(deferredNotes.length - i);
          }
        }
      },
    );
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
