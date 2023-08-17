import type { IAnkiAddNotes, IAnkiOptions } from "../types/anki";
import Config from "~/config";
import type { NoteData } from "~/ankiNoteBuilder";

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

  export function requestAnkiInfo(): void {
    throw new Error("Unimplemented for desktop");
  }

  /** Throws an error if not successfully connected. */
  export async function canGetAnkiInfo(): Promise<boolean> {
    await checkConnection();
    return true;
  }

  export async function deckNames(): Promise<string[]> {
    return (await request("deckNames")) as string[];
  }

  export async function notetypeNames(): Promise<string[]> {
    return (await request("modelNames")) as string[];
  }

  export async function nodeTypeFields(
    noteTypeName: string
  ): Promise<string[]> {
    return (await request("modelFieldNames", {
      modelName: noteTypeName,
    })) as string[];
  }

  export async function tags(): Promise<string[]> {
    return (await request("getTags")) as string[];
  }

  export async function addNote(note: NoteData): Promise<void> {
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
      if (err instanceof Error) {
        err.message +=
          " <a href='https://apps.ankiweb.net/'>(Anki)</a> <a href='https://ankiweb.net/shared/info/2055492159'>(AnkiConnect)</a>";
      }
      throw err;
    }
  }
}

AnkiApi satisfies IAnkiAddNotes;
AnkiApi satisfies IAnkiOptions;
