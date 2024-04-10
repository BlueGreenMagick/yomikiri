import type {
  AnkiInfo,
  IAnkiAddNotes,
  IAnkiOptions,
  NotetypeInfo,
} from "../common/anki";
import Config from "~/config";
import type { NoteData } from "~/ankiNoteBuilder";
import { BrowserApi } from "~/extension/browserApi";
import type { DesktopPlatform } from ".";

const ANKI_CONNECT_VER = 6;

/**
 * Uses Anki-Connect on desktop.
 * Should not be used in content script
 * as Anki-connect allows only calls from trusted origins.
 */
class DesktopAnkiApi implements IAnkiAddNotes, IAnkiOptions {
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
  private async request(action: string, params?: unknown): Promise<unknown> {
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

    const data = await response.json();

    if (Object.getOwnPropertyNames(data).length != 2) {
      throw new Error("response has an unexpected number of fields");
    }
    if (!Object.prototype.hasOwnProperty.call(data, "error")) {
      throw new Error("response is missing required error field");
    }
    if (!Object.prototype.hasOwnProperty.call(data, "result")) {
      throw new Error("response is missing required result field");
    }
    if (data.error) {
      throw new Error(data.error);
    }
    return data.result;
  }

  async getAnkiInfo(): Promise<AnkiInfo> {
    return this.fetchAnkiInfo();
  }

  async requestAnkiInfo(): Promise<void> {
    await this.checkConnection();
  }

  private async fetchAnkiInfo(): Promise<AnkiInfo> {
    const decks = (await this.request("deckNames")) as string[];
    const notetypes = (await this.request("modelNames")) as string[];
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
    return (await this.request("modelFieldNames", {
      modelName: noteTypeName,
    })) as string[];
  }

  async tags(): Promise<string[]> {
    return (await this.request("getTags")) as string[];
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
    try {
      const resp = await this.request("requestPermission");
      if (resp.permission === "granted") {
        return;
      } else {
        throw new Error("AnkiConnect did not allow this app to use its api.");
      }
    } catch (err) {
      throw err;
    }
  }
}

export const AnkiApi = DesktopAnkiApi
export type AnkiApi = DesktopAnkiApi