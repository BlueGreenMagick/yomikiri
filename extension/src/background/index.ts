import { Dictionary, type InstallProgress } from "../dictionary";
import type { Entry } from "../dicEntry";
import {
  Tokenizer,
  type TokenizeResult,
  type TokenizeRequest,
} from "../tokenizer";
import { Api, type MessageSender, type Port } from "~/api";
import AnkiApi from "@platform/anki";
import Utils from "../utils";
import type { NoteData } from "~/ankiNoteBuilder";
import Config from "~/config";

let dictionary = new Dictionary();
let dictionaryLoadedP: Promise<Dictionary> = dictionary.initialize();
let tokenizerP: Promise<Tokenizer> = Tokenizer.initialize(dictionaryLoadedP);
let initializingP = initialize();

async function initialize() {
  await Api.initialize({
    handleRequests: true,
    handleConnection: true,
    context: "background",
  });
  await Config.initialize();
}

async function searchTerm(term: string): Promise<Entry[]> {
  await initializingP;
  await dictionaryLoadedP;
  return await dictionary.search(term);
}

async function tokenize(req: TokenizeRequest): Promise<TokenizeResult> {
  await initializingP;
  let tokenizer = await tokenizerP;
  return await tokenizer.tokenize(req);
}

async function addAnkiNote(note: NoteData): Promise<void> {
  await initializingP;
  return await AnkiApi.addNote(note);
}

function tabId(_req: null, sender: MessageSender): number | undefined {
  return sender.tab?.id;
}

async function dictionaryCheckInstall(port: Port) {
  await initializingP;
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
