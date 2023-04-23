import { Dictionary, Entry } from "./dictionary";
import loadTokenizerWasm, { type Token } from "@yomikiri/tokenizer";

import Api from "./api";

let dictionary = Dictionary.loadFromUrl("assets/jmdict/en.json.gz");
let tokenizer = loadTokenizer();

async function loadTokenizer() {
  const Tokenizer = await loadTokenizerWasm();
  return new Tokenizer();
}

async function searchTerm(term: string): Promise<Entry[]> {
  let dict = await dictionary;
  return dict.search(term);
}

async function tokenize(text: string): Promise<Token[]> {
  let tok = await tokenizer;
  return tok.tokenize(text);
}

Api.handleRequest("searchTerm", searchTerm);
Api.handleRequest("tokenize", tokenize);
