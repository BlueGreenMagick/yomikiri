import type { IAnkiApiStatic } from "../types/anki";
import Config from "~/config";
import Utils from "~/utils";
import type { NoteData } from "~/anki";

/**
 * Uses Anki-Connect on desktop.
 * Should not be used in content script
 * as Anki-connect allows only calls from trusted origins.
 */
export default class AnkiApi {
  static readonly ANKI_CONNECT_VER = 6;

  private static async ankiConnectURL(): Promise<string> {
    let url = await Config.get("anki.connect_url");
    let port = await Config.get("anki.connect_port");
    if (!url.includes("://")) {
      url = "http://" + url;
    }
    return url + ":" + port;
  }

  /** Send Anki-connect request */
  private static async request(action: string, params?: any): Promise<any> {
    const ankiConnectUrl = await AnkiApi.ankiConnectURL();
    console.log("Abc");
    const response = await fetch(ankiConnectUrl, {
      method: "POST",
      body: JSON.stringify({
        action,
        version: AnkiApi.ANKI_CONNECT_VER,
        params,
      }),
    });
    const data = await response.json();
    console.log(data);

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

  static async profiles(): Promise<string[]> {
    return (await AnkiApi.request("getProfiles")) as string[];
  }

  static async deckNames(): Promise<string[]> {
    return (await AnkiApi.request("deckNames")) as string[];
  }

  static async notetypeNames(): Promise<string[]> {
    return (await AnkiApi.request("modelNames")) as string[];
  }

  static async nodeTypeFields(noteTypeName: string): Promise<string[]> {
    return (await AnkiApi.request("modelFieldNames", {
      modelName: noteTypeName,
    })) as string[];
  }

  static async tags(): Promise<string[]> {
    return (await AnkiApi.request("getTags")) as string[];
  }

  static async addNote(note: NoteData): Promise<void> {
    const fields: { [key: string]: string } = {};
    for (const field of note.fields) {
      fields[field.name] = field.value;
    }
    await AnkiApi.request("addNote", {
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
  static async checkConnection(): Promise<void> {
    const resp = await AnkiApi.request("requestPermission");
    if (resp.permission === "granted") {
      return;
    } else {
      throw new Error("AnkiConnect did not allow this app to use its api.");
    }
  }

  static async onReceiveAnkiInfo(handler: any) {
    throw new Error("Only implemented on IOS");
  }
}

AnkiApi satisfies IAnkiApiStatic;
