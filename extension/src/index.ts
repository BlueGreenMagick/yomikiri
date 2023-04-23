import { Dictionary, Entry } from "./dictionary";

interface MessageBase {
    key: string;
}

interface searchTermMessage extends MessageBase {
    key: "searchTerm",
    term: string
}

type Message = searchTermMessage;

let dictionary = Dictionary.loadFromUrl("assets/jmdict/en.json.gz");

async function searchTerm(term: string): Promise<Entry[]> {
    let dict = await dictionary;
    return dict.search(term);
}

chrome.runtime.onMessage.addListener(async (message: Message, sender, respond) => {
    if (message.key === "searchTerm") {
        let result = await searchTerm(message.term);
        respond(result);
    }
})