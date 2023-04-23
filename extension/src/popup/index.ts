import { Entry } from "../dictionary";

function searchClicked() {
    const input = document.getElementById("search") as HTMLInputElement;
    const term = input.value;
    chrome.runtime.sendMessage({
        key: "searchTerm",
        term: term
    }, (resp: Entry[]) => {
        const resultEl = document.getElementById("results") as HTMLElement;
        let text = ""
        for (const entry of resp) {
            for (const sense of entry.sense) {
                text += sense.meaning.join(", ") + "<br/>";
            }
            text += "<br/>---<br/>"
        }
        resultEl.innerHTML = text;
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const el = document.getElementById("search-button") as HTMLElement;
    el.addEventListener("click", () => searchClicked())
})