import { Dictionary, Entry } from "./dictionary";
import {
  Tokenizer,
  type TokenizeResult,
  type TokenizeRequest,
} from "./tokenizer";
import Api from "./api";
import AnkiApi from "@platform/anki";
import type { NoteData } from "~/anki";
import EnJMDict from "./assets/jmdict/en.json.gz";

let dictionaryP = Dictionary.loadFromUrl(EnJMDict);
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
Api.initialize();
Api.handleRequest("searchTerm", searchTerm);
Api.handleRequest("tokenize", tokenize);
Api.handleRequest("addAnkiNote", addAnkiNote);

// expose object to window for debugging purposes
// @ts-ignore
window.dictionaryP = dictionaryP;
// @ts-ignore
window.tokenizerP = tokenizerP;
//@ts-ignore
window.AnkiApi = AnkiApi;
// @ts-ignore
window.Api = Api;
