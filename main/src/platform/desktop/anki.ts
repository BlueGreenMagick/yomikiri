import type {
  AnkiInfo,
  IAnkiAddNotes,
  IAnkiOptions,
  NotetypeInfo,
} from "../common/anki";
import Config from "~/config";
import type { NoteData } from "~/ankiNoteBuilder";
import { BrowserApi } from "~/extension/browserApi";

/**
 * Uses Anki-Connect on desktop.
 * Should not be used in content script
 * as Anki-connect allows only calls from trusted origins.
 */
export namespace AnkiApi {
  const ANKI_CONNECT_VER = 6;

  async function ankiConnectURL(): Promise<string> {
    let url = await Config.get("anki.connect_url");
    let port = await Config.get("anki.connect_port");
    if (!url.includes("://")) {
      url = "http://" + url;
    }
    return url + ":" + port;
  }

  /** Send Anki-connect request */
  async function request(action: string, params?: any): Promise<any> {
    const ankiConnectUrl = await ankiConnectURL();
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
    if (!data.hasOwnProperty("error")) {
      throw new Error("response is missing required error field");
    }
    if (!data.hasOwnProperty("result")) {
      throw new Error("response is missing required result field");
    }
    if (data.error) {
      throw new Error(data.error);
    }
    return data.result;
  }

  export async function getAnkiInfo(): Promise<AnkiInfo> {
    return fetchAnkiInfo();
  }

  export async function requestAnkiInfo(): Promise<void> {
    await checkConnection();
  }

  async function fetchAnkiInfo(): Promise<AnkiInfo> {
    const decks = (await request("deckNames")) as string[];
    const notetypes = (await request("modelNames")) as string[];
    let ankiInfo: AnkiInfo = {
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

  async function notetypeFields(noteTypeName: string): Promise<string[]> {
    return (await request("modelFieldNames", {
      modelName: noteTypeName,
    })) as string[];
  }

  export async function tags(): Promise<string[]> {
    return (await request("getTags")) as string[];
  }

  export async function addNote(note: NoteData): Promise<void> {
    if (BrowserApi.context === "contentScript") {
      return BrowserApi.request("addAnkiNote", note);
    }

    const fields: { [key: string]: string } = {};
    for (const field of note.fields) {
      fields[field.name] = field.value;
    }
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
  }

  /** Throws an error if not successfully connected. */
  export async function checkConnection(): Promise<void> {
    try {
      const resp = await request("requestPermission");
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

AnkiApi satisfies IAnkiAddNotes;
AnkiApi satisfies IAnkiOptions;
