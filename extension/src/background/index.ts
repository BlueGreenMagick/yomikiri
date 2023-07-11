/** initialize Api before any other code are run */
import "./initial";
import type { Entry } from "../dicEntry";
import {
  BackendWrapper,
  type TokenizeResult,
  type TokenizeRequest,
} from "./backend";
import { Api, type MessageSender } from "~/api";
import { AnkiApi } from "@platform/anki";
import Utils from "../utils";
import type { NoteData } from "~/ankiNoteBuilder";

declare global {
  interface Window {
    backend: BackendWrapper;
    AnkiApi: typeof AnkiApi;
    Api: typeof Api;
    Utils: typeof Utils;
  }
}

let backend: BackendWrapper = new BackendWrapper();

async function searchTerm(term: string): Promise<Entry[]> {
  return await backend.searchTerm(term);
}

async function tokenize(req: TokenizeRequest): Promise<TokenizeResult> {
  return await backend.tokenize(req);
}

async function addAnkiNote(note: NoteData): Promise<void> {
  return await AnkiApi.addNote(note);
}

function tabId(_req: null, sender: MessageSender): number | undefined {
  return sender.tab?.id;
}

Api.handleRequest("searchTerm", searchTerm);
Api.handleRequest("tokenize", tokenize);
Api.handleRequest("addAnkiNote", addAnkiNote);
Api.handleRequest("tabId", tabId);

// expose object to window for debugging purposes
window.backend = backend;
window.AnkiApi = AnkiApi;
window.Api = Api;
window.Utils = Utils;
