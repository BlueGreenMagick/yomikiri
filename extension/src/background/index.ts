/** initialize Api before any other code are run */
import "./initial";
import type { Entry } from "../dicEntry";
import { Backend, type TokenizeResult, type TokenizeRequest } from "./backend";
import { Api, type MessageSender } from "~/api";
import { AnkiApi } from "@platform/anki";
import Utils from "../utils";
import type { NoteData } from "~/ankiNoteBuilder";
import Config from "~/config";

declare global {
  // ServiceWorkerGlobalScope in service_worker
  interface Window {
    backend: typeof Backend;
    AnkiApi: typeof AnkiApi;
    Api: typeof Api;
    Utils: typeof Utils;
  }
}

async function searchTerm(term: string): Promise<Entry[]> {
  return await Backend.searchTerm(term);
}

async function tokenize(req: TokenizeRequest): Promise<TokenizeResult> {
  return await Backend.tokenize(req);
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
self.backend = Backend;
self.AnkiApi = AnkiApi;
self.Api = Api;
self.Utils = Utils;
