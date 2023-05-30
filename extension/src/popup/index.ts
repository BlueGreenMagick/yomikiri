import Api from "~/api";
import { Entry } from "~/dictionary";

async function searchClicked() {
  const input = document.getElementById("search-input") as HTMLInputElement;
  const term = input.value;
  let response = await Api.request("searchTerm", term);

  const resultEl = document.getElementById("search-results") as HTMLElement;
  let text = "";
  for (const entry of response) {
    for (const sense of entry.senses) {
      text += sense.meaning.join(", ") + "<br/>";
    }
    text += "<br/>---<br/>";
  }
  resultEl.innerHTML = text;
}

async function tokenizeClicked() {
  const inputEl = document.getElementById("tokenize-input") as HTMLInputElement;
  const input = inputEl.value;
  const response = await Api.request("tokenize", {
    text: input,
    selectedCharIdx: 0,
  });

  const resultEl = document.getElementById("tokenize-results") as HTMLElement;
  let text = "";
  for (const token of response.tokens) {
    text += token.text + ", ";
  }
  resultEl.textContent = text;
}

async function openSettings() {
  chrome.runtime.openOptionsPage();
}

Api.initialize();

document.addEventListener("DOMContentLoaded", () => {
  const searchBtn = document.getElementById("search-button") as HTMLElement;
  searchBtn.addEventListener("click", () => searchClicked());
  const tokenizeBtn = document.getElementById("tokenize-button") as HTMLElement;
  tokenizeBtn.addEventListener("click", () => tokenizeClicked());
  const settingsBtn = document.getElementById("settings-button") as HTMLElement;
  settingsBtn.addEventListener("click", openSettings);
});
