import { Dictionary, Entry } from "./dictionary";
import {
  Tokenizer,
  type TokenizeResult,
  type TokenizeRequest,
} from "./tokenizer";
import Api from "./api";
import AnkiApi from "@platform/anki";
import Utils from "./utils";
import type { NoteData } from "~/anki";
import Config from "./config";

type MessageSender = chrome.runtime.MessageSender;

let dictionaryP = Dictionary.initialize();
let tokenizerP = Tokenizer.initialize(dictionaryP);

async function searchTerm(term: string): Promise<Entry[]> {
  let dictionary = await dictionaryP;
  return await dictionary.search(term);
}

async function tokenize(req: TokenizeRequest): Promise<TokenizeResult> {
  let tokenizer = await tokenizerP;
  return await tokenizer.tokenize(req);
}

async function addAnkiNote(note: NoteData): Promise<number> {
  return await AnkiApi.addNote(note);
}

async function ankiUrl(_: null, sender: MessageSender) {
  await chrome.tabs.create({
    url:
      "anki://x-callback-url/infoForAdding?x-success=https://google.com/x-callback-url/openTab?tab=" +
      sender.tab?.id,
  });
}

Api.initialize({ handleRequests: true });
Api.handleRequest("searchTerm", searchTerm);
Api.handleRequest("tokenize", tokenize);
Api.handleRequest("addAnkiNote", addAnkiNote);

// expose object to window for debugging purposes
//@ts-ignore
self.dictionaryP = dictionaryP;
//@ts-ignore
self.tokenizerP = tokenizerP;
//@ts-ignore
self.AnkiApi = AnkiApi;
// @ts-ignore
self.Api = Api;
// @ts-ignore
self.Utils = Utils;
