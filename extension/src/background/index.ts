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

let backendP: Promise<BackendWrapper> = BackendWrapper.initialize();

async function searchTerm(term: string): Promise<Entry[]> {
  let backend = await backendP;
  return await backend.searchTerm(term);
}

async function tokenize(req: TokenizeRequest): Promise<TokenizeResult> {
  let backend = await backendP;
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
//@ts-ignore
self.backendP = backendP;
//@ts-ignore
self.AnkiApi = AnkiApi;
// @ts-ignore
self.Api = Api;
// @ts-ignore
self.Utils = Utils;
