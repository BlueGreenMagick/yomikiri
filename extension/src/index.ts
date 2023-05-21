import { Dictionary, Entry } from "./dictionary";
import { Tokenizer, type Token } from "./tokenizer/tokenizer";
import Api from "./api";
import AnkiApi, { type Note } from "./api/anki";
import EnJMDict from "./assets/jmdict/en.json.gz";

let dictionaryP = Dictionary.loadFromUrl(EnJMDict);
let tokenizerP = Tokenizer.initialize(dictionaryP);

async function searchTerm(term: string): Promise<Entry[]> {
  let dictionary = await dictionaryP;
  return dictionary.search(term);
}

async function tokenize(text: string): Promise<Token[]> {
  let tokenizer = await tokenizerP;
  return tokenizer.tokenize(text);
}

async function addAnkiNote(note: Note): Promise<number> {
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
