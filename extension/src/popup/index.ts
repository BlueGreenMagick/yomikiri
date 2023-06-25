import "./global.css";
import { Api } from "~/api";
import Popup from "./Popup.svelte";

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

Api.initialize({ context: "page" });

const svelte = new Popup({ target: document.body, props: {} });
