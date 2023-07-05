/** initialize Api before any other code are run */
import "./initial";
import { Dictionary, type InstallProgress } from "../dictionary";
import type { Entry } from "../dicEntry";
import {
  Tokenizer,
  type TokenizeResult,
  type TokenizeRequest,
} from "../tokenizer";
import { Api, type MessageSender, type Port } from "~/api";
import { AnkiApi } from "@platform/anki";
import Utils from "../utils";
import type { NoteData } from "~/ankiNoteBuilder";

let dictionary = new Dictionary();
let dictionaryLoadedP: Promise<Dictionary> = dictionary.initialize();
let tokenizerP: Promise<Tokenizer> = Tokenizer.initialize(dictionaryLoadedP);

async function searchTerm(term: string): Promise<Entry[]> {
  await dictionaryLoadedP;
  return await dictionary.search(term);
}

async function tokenize(req: TokenizeRequest): Promise<TokenizeResult> {
  let tokenizer = await tokenizerP;
  return await tokenizer.tokenize(req);
}

async function addAnkiNote(note: NoteData): Promise<void> {
  return await AnkiApi.addNote(note);
}

function tabId(_req: null, sender: MessageSender): number | undefined {
  return sender.tab?.id;
}

async function dictionaryCheckInstall(port: Port) {
  if (dictionary.installed) {
    port.disconnect();
  } else {
    const lastUpdateProgress = dictionary.lastUpdateProgress;
    if (lastUpdateProgress !== undefined) {
      port.postMessage(lastUpdateProgress);
    }
    const onProgress = (progress: InstallProgress) => {
      port.postMessage(progress);
    };
    dictionary.installProgressHandlers.push(onProgress);
    port.onDisconnect.addListener((port) => {
      const idx = dictionary.installProgressHandlers.indexOf(onProgress);
      if (idx !== -1) {
        dictionary.installProgressHandlers.splice(idx, 1);
      }
    });

    dictionaryLoadedP.then(() => {
      port.disconnect();
    });
  }
}

Api.handleRequest("searchTerm", searchTerm);
Api.handleRequest("tokenize", tokenize);
Api.handleRequest("addAnkiNote", addAnkiNote);
Api.handleRequest("tabId", tabId);

Api.handleConnection("dictionaryCheckInstall", dictionaryCheckInstall);

// expose object to window for debugging purposes
//@ts-ignore
self.dictionary = dictionary;
//@ts-ignore
self.tokenizerP = tokenizerP;
//@ts-ignore
self.AnkiApi = AnkiApi;
// @ts-ignore
self.Api = Api;
// @ts-ignore
self.Utils = Utils;
