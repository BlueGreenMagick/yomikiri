import Api from "../api";
import { Entry } from "dictionary";

async function searchClicked() {
  const input = document.getElementById("search-input") as HTMLInputElement;
  const term = input.value;
  let response = (await Api.request("searchTerm", term)).map(
    (e) => new Entry(e)
  );

  const resultEl = document.getElementById("search-results") as HTMLElement;
  let text = "";
  for (const entry of response) {
    for (const sense of entry.sense) {
      text += sense.meaning.join(", ") + "<br/>";
    }
    text += "<br/>---<br/>";
  }
  resultEl.innerHTML = text;
}

async function tokenizeClicked() {
  const inputEl = document.getElementById("tokenize-input") as HTMLInputElement;
  const input = inputEl.value;
  const response = await Api.request("tokenize", input);

  const resultEl = document.getElementById("tokenize-results") as HTMLElement;
  let text = "";
  for (const token of response) {
    text += token.text + ", ";
  }
  resultEl.textContent = text;
}

document.addEventListener("DOMContentLoaded", () => {
  const searchBtn = document.getElementById("search-button") as HTMLElement;
  searchBtn.addEventListener("click", () => searchClicked());
  const tokenizeBtn = document.getElementById("tokenize-button") as HTMLElement;
  tokenizeBtn.addEventListener("click", () => tokenizeClicked());
});
