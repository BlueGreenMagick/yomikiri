export default class AnkiApi {
  static readonly ANKI_CONNECT_VER = 6;

  static ankiConnectPort: number = 8765;

  static AnkiConnectUrl(): string {
    return `http://127.0.0.1:${AnkiApi.ankiConnectPort}`;
  }

  /** Send Anki-connect request */
  private static request(action: string, params?: any): Promise<any> {
    return new Promise((resolve, reject) => {
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

      xhr.open("POST", AnkiApi.AnkiConnectUrl());
      xhr.send(
        JSON.stringify({ action, version: AnkiApi.ANKI_CONNECT_VER, params })
      );
    });
  }

  /** Returns null if successfully connected. Else returns an error string. */
  static async checkConnection(): Promise<string | null> {
    try {
      const resp = await AnkiApi.request("requestPermission");
      if (resp.permission === "granted") {
        return null;
      } else {
        return "AnkiConnect did not allow this app to use its api.";
      }
    } catch (e) {
      if (typeof e === "string") {
        return e;
      } else {
        return "An unknown error occured.";
      }
    }
  }

  static async deckNames(): Promise<string[]> {
    return (await AnkiApi.request("deckNames")) as string[];
  }

  static async noteTypeNames(): Promise<string[]> {
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
}
