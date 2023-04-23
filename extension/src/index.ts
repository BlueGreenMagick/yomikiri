import { Dictionary, Entry } from "./dictionary";
import Api from "./api";

let dictionary = Dictionary.loadFromUrl("assets/jmdict/en.json.gz");

async function searchTerm(term: string): Promise<Entry[]> {
    let dict = await dictionary;
    return dict.search(term);
}

Api.handleRequest("searchTerm", async (term: string) => {
    return await searchTerm(term);
})