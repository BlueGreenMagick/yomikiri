import type { Entry } from "../../dicEntry";
import { Backend, type TokenizeResult, type TokenizeRequest } from "@platform/backend";
import { BrowserApi, type MessageSender } from "~/extension/browserApi";
import { Platform, type TranslateResult } from "@platform";
import { AnkiApi } from "@platform/anki";
import Utils from "../../utils";
import type { NoteData } from "~/ankiNoteBuilder";
import Config from "~/config";

declare global {
  // ServiceWorkerGlobalScope in service_worker
  interface Window {
    backend: typeof Backend;
    AnkiApi: typeof AnkiApi;
    Api: typeof BrowserApi;
    Utils: typeof Utils;
    Config: typeof Config;
    maybeInitBackend: typeof maybeInitBackend;
  }
}


let initialized: Promise<void> = initialize();

async function initialize(): Promise<void> {
  BrowserApi.initialize({
    handleRequests: true,
    context: "background",
  });
  Platform.initialize();
  await Config.initialize();
}

let _backendInitialized: Promise<void> | undefined;

async function maybeInitBackend(): Promise<void> {
  await initialized;
  if (_backendInitialized === undefined) {
    _backendInitialized = Backend.initialize();
  }
  await _backendInitialized;
}

async function searchTerm(term: string): Promise<Entry[]> {
  await maybeInitBackend();
  return await Backend.search(term);
}

async function tokenize(req: TokenizeRequest): Promise<TokenizeResult> {
  await maybeInitBackend();
  return await Backend.tokenize(req.text, req.charAt);
}

async function addAnkiNote(note: NoteData): Promise<void> {
  await initialized;
  return await AnkiApi.addNote(note);
}

function tabId(_req: null, sender: MessageSender): number | undefined {
  return sender.tab?.id;
}

async function handleTranslate(req: string): Promise<TranslateResult> {
  await initialized;
  return await Platform.translate(req);
}

async function stateEnabledChanged(value: boolean): Promise<void> {
  await initialized;
  if (value) {
    BrowserApi.setBadge("", "#999999")
  } else {
    BrowserApi.setBadge("off", "#999999")
  }

  Config.set("state.enabled", value, false);
}

async function tts(text: string): Promise<void> {
  await initialized;
  BrowserApi.speakJapanese(text);
}

BrowserApi.handleRequest("searchTerm", searchTerm);
BrowserApi.handleRequest("tokenize", tokenize);
BrowserApi.handleRequest("addAnkiNote", addAnkiNote);
BrowserApi.handleRequest("tabId", tabId);
BrowserApi.handleRequest("translate", handleTranslate);
BrowserApi.handleRequest("stateEnabledChanged", stateEnabledChanged);
BrowserApi.handleRequest("tts", tts);

// expose object to window for debugging purposes
self.backend = Backend;
self.AnkiApi = AnkiApi;
self.Api = BrowserApi;
self.Utils = Utils;
self.Config = Config;
self.maybeInitBackend = maybeInitBackend;
