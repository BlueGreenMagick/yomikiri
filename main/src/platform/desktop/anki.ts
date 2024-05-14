import type {
  AnkiInfo,
  IAnkiAddNotes,
  IAnkiOptions,
  NotetypeInfo,
} from "../common/anki";
import Config from "~/lib/config";
import type { NoteData } from "~/lib/ankiNoteBuilder";
import { BrowserApi } from "~/extension/browserApi";
import type { DesktopPlatform } from ".";
import type { First, Second } from "~/lib/utils";

const ANKI_CONNECT_VER = 6;

interface AnkiConnectSuccess<T> {
  result: T,
  error: null
}

interface AnkiConnectError {
  result: null
  error: string
}

type AnkiConnectResponse<T> = AnkiConnectSuccess<T> | AnkiConnectError

interface AnkiConnectPermission {
  permission: "granted" | "denied"
}

interface AnkiConnectModelFieldNamesParams {
  modelName: string
}

interface AnkiConnectNoteAttachment {
  url: string,
  filename: string,
  skipHash: string,
  fields: string[]
}

interface AnkiConnectNote {
  deckName: string,
  modelName: string,
  fields: Record<string, string>,
  tags?: string[] | null,
  audio?: AnkiConnectNoteAttachment | AnkiConnectNoteAttachment[] | null,
  video?: AnkiConnectNoteAttachment | AnkiConnectNoteAttachment[] | null,
  picture?: AnkiConnectNoteAttachment | AnkiConnectNoteAttachment[] | null,
  options?: {
    allowDuplicate?: boolean | null,
    duplicateScope?: "deck" | null,
    duplicateScopeDeckName?: {
      deckName?: string | null,
      checkChildren: boolean,
      checkAllModels: boolean
    } | null
  } | null
}


interface AnkiConnectAddNoteParams {
  note: AnkiConnectNote
}

export interface AnkiConnectRequestMap {
  deckNames: [never, string[]],
  modelNames: [never, string[]],
  modelFieldNames: [AnkiConnectModelFieldNamesParams, string[]],
  getTags: [never, string[]],
  addNote: [AnkiConnectAddNoteParams, void],
  requestPermission: [never, AnkiConnectPermission]
}


/**
 * Uses Anki-Connect on desktop.
 * Should not be used in content script
 * as Anki-connect allows only calls from trusted origins.
 */
export class DesktopAnkiApi implements IAnkiAddNotes, IAnkiOptions {
  platform: DesktopPlatform
  browserApi: BrowserApi
  config: Config

  constructor(platform: DesktopPlatform, config: Config) {
    this.platform = platform
    this.browserApi = platform.browserApi
    this.config = config
  }

  private ankiConnectURL(): string {
    let url = this.config.get("anki.connect_url");
    const port = this.config.get("anki.connect_port");
    if (!url.includes("://")) {
      url = "http://" + url;
    }
    return `${url}:${port}`
  }

  /** Send Anki-connect request */
  private async request<K extends keyof AnkiConnectRequestMap>(action: K, params?: First<AnkiConnectRequestMap[K]>): Promise<Second<AnkiConnectRequestMap[K]>> {
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
      throw new Error(
        "Failed to connect to Anki. Please check that Anki is running and AnkiConnect add-on is configured correctly."
      );
    }

    const data = await response.json() as AnkiConnectResponse<Second<AnkiConnectRequestMap[K]>>;

    if (Object.getOwnPropertyNames(data).length != 2) {
      throw new Error("response has an unexpected number of fields");
    }
    if (!Object.prototype.hasOwnProperty.call(data, "error")) {
      throw new Error("response is missing required error field");
    }
    if (!Object.prototype.hasOwnProperty.call(data, "result")) {
      throw new Error("response is missing required result field");
    }
    if (data.error !== null) {
      throw new Error(data.error);
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

  async addNote(note: NoteData): Promise<void> {
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
      throw new Error("AnkiConnect did not allow this app to use its api.");
    }
  }
}

export const AnkiApi = DesktopAnkiApi
export type AnkiApi = DesktopAnkiApi