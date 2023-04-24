import { Dictionary, Entry } from "./dictionary";
import { Tokenizer, type Token } from "./tokenizer/tokenizer";
import Api from "./api";

let dictionaryP = Dictionary.loadFromUrl("assets/jmdict/en.json.gz");
let tokenizerP = loadTokenizer();

async function loadTokenizer() {
  return Tokenizer.initialize(dictionaryP);
}

async function searchTerm(term: string): Promise<Entry[]> {
  let dictionary = await dictionaryP;
  return dictionary.search(term);
}

async function tokenize(text: string): Promise<Token[]> {
  let tokenizer = await tokenizerP;
  return tokenizer.tokenize(text);
}

Api.handleRequest("searchTerm", searchTerm);
Api.handleRequest("tokenize", tokenize);
