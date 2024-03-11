import type { Entry } from "../../dicEntry";
import { Backend, type TokenizeResult, type TokenizeRequest } from "@platform/backend";
import { BrowserApi, type MessageSender } from "~/extension/browserApi";
import { Platform } from "@platform";
import { AnkiApi } from "@platform/anki";
import Utils from "../../utils";
import type { NoteData } from "~/ankiNoteBuilder";
import Config from "~/config";
import { translate, type TranslateResult } from "~/translate";

declare global {
  // ServiceWorkerGlobalScope in service_worker
  interface Window {
    backend: typeof Backend;
    AnkiApi: typeof AnkiApi;
    Api: typeof BrowserApi;
    Utils: typeof Utils;
    Config: typeof Config;
    ensureInitialized: typeof ensureInitialized;
  }
}

let _initialized: Promise<void> | undefined;

async function _initialize() {
  BrowserApi.initialize({
    handleRequests: true,
    context: "background",
  });
  Platform.initialize();
  await Config.initialize();
  await Backend.initialize();
}

async function ensureInitialized() {
  if (_initialized === undefined) {
    _initialized = _initialize();
  }
  return _initialized;
}

async function searchTerm(term: string): Promise<Entry[]> {
  await ensureInitialized();
  return await Backend.search(term);
}

async function tokenize(req: TokenizeRequest): Promise<TokenizeResult> {
  await ensureInitialized();
  return await Backend.tokenize(req.text, req.charAt);
}

async function addAnkiNote(note: NoteData): Promise<void> {
  await ensureInitialized();
  return await AnkiApi.addNote(note);
}

function tabId(_req: null, sender: MessageSender): number | undefined {
  return sender.tab?.id;
}

async function handleTranslate(req: string): Promise<TranslateResult> {
  await ensureInitialized();
  return await translate(req);
}

async function stateEnabledChanged(value: boolean): Promise<void> {
  await ensureInitialized();
  if (value) {
    BrowserApi.setBadge("", "#999999")
  } else {
    BrowserApi.setBadge("off", "#999999")
  }

  Config.set("state.enabled", value, false);
}

async function tts(text: string): Promise<void> {
  await ensureInitialized();
  BrowserApi.speakJapanese(text);
}

ensureInitialized();

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
self.ensureInitialized = ensureInitialized;
