import { Dictionary, Entry } from "./dictionary";
import Api from "./api";

let dictionary = Dictionary.loadFromUrl("assets/jmdict/en.json.gz");

async function searchTerm(term: string): Promise<Entry[]> {
    let dict = await dictionary;
    return dict.search(term);
}

Api.addRequestHandler("searchTerm", async (term: string, respond ) => {
    let result = await searchTerm(term);
    respond(result);
})