import { Entry } from "../dictionary";
import Api from "../api";

async function searchClicked() {
    const input = document.getElementById("search") as HTMLInputElement;
    const term = input.value;
    let response = await Api.request("searchTerm", term);

    const resultEl = document.getElementById("results") as HTMLElement;
    let text = ""
    for (const entry of response) {
        for (const sense of entry.sense) {
            text += sense.meaning.join(", ") + "<br/>";
        }
        text += "<br/>---<br/>"
    }
    resultEl.innerHTML = text;
}

document.addEventListener("DOMContentLoaded", () => {
    const el = document.getElementById("search-button") as HTMLElement;
    el.addEventListener("click", () => searchClicked())
})