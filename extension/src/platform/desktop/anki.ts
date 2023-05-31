import type { IAnkiApiStatic, LoginStatus } from "../types/anki";
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
    const [promise, resolve, reject] = Utils.createPromise();
    const ankiConnectUrl = await AnkiApi.ankiConnectURL();

    const xhr = new XMLHttpRequest();
    xhr.addEventListener("error", () => reject("failed to issue request"));
    xhr.addEventListener("load", () => {
      try {
        const response = JSON.parse(xhr.responseText);
        if (Object.getOwnPropertyNames(response).length != 2) {
          throw "response has an unexpected number of fields";
        }
        if (!response.hasOwnProperty("error")) {
          throw "response is missing required error field";
        }
        if (!response.hasOwnProperty("result")) {
          throw "response is missing required result field";
        }
        if (response.error) {
          throw response.error;
        }
        resolve(response.result);
      } catch (e) {
        reject(e);
      }
    });
    xhr.open("POST", ankiConnectUrl);
    xhr.send(
      JSON.stringify({ action, version: AnkiApi.ANKI_CONNECT_VER, params })
    );
    return promise;
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

  static async addNote(note: NoteData): Promise<number> {
    const fields: { [key: string]: string } = {};
    for (const field of note.fields) {
      fields[field.name] = field.value;
    }
    return (await AnkiApi.request("addNote", {
      note: {
        deckName: note.deck,
        modelName: note.notetype,
        fields: fields,
        tags: note.tags.split(" "),
        options: {
          allowDuplicate: true,
        },
      },
    })) as number;
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

  static async login(username: string, password: string) {
    throw new Error("Invalid for desktop");
  }

  static async logout() {
    throw new Error("Invalid for desktop");
  }

  static async loginStatus(): Promise<LoginStatus> {
    throw new Error("Invalid for desktop");
  }
}

AnkiApi satisfies IAnkiApiStatic;
