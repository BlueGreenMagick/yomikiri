/**
 * Background worker for extension
 * 
 * loaded on desktop / ios
 */

import type { Entry } from "../../dicEntry";
import { Backend, type TokenizeResult, type TokenizeRequest } from "@platform/backend";
import { BrowserApi, type MessageSender } from "~/extension/browserApi";
import { Platform, type TranslateResult } from "@platform";
import { AnkiApi } from "@platform/anki";
import Utils from "../../utils";
import type { NoteData } from "~/ankiNoteBuilder";
import Config from "~/config";
import { updateTTSAvailability } from "~/common";

const initialized: Promise<void> = initialize();
let _backendInitialized: Promise<void> | undefined;

async function initialize(): Promise<void> {
  BrowserApi.initialize({
    handleRequests: true,
    context: "background",
  });
  Platform.initialize();
  await Config.initialize();

  // queue task to run later
  setTimeout(deferredInitialize, 0)
}

/** Non-essential code to run at startup but not immediately */
async function deferredInitialize(): Promise<void> {
  await updateTTSAvailability();
}

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
  await AnkiApi.addNote(note);
}

function tabId(_req: null, sender: MessageSender): number | undefined {
  return sender.tab?.id;
}

async function handleTranslate(req: string): Promise<TranslateResult> {
  await initialized;
  return await Platform.translate(req);
}

async function updateStateEnabledBadge(): Promise<void> {
  const enabled = Config.get("state.enabled");
  const text = enabled ? "" : "off";
  BrowserApi.setBadge(text, "#999999");
}

async function tts(text: string): Promise<void> {
  await initialized;
  Platform.playTTS(text)
}

/** On ios, toggle state.enabled when action item is clicked */
async function onActionClick() {
  await initialized;
  const prevEnabled = Config.get("state.enabled");
  const enabled = !prevEnabled;
  Config.set("state.enabled", enabled);
}


BrowserApi.handleRequest("searchTerm", searchTerm);
BrowserApi.handleRequest("tokenize", tokenize);
BrowserApi.handleRequest("addAnkiNote", addAnkiNote);
BrowserApi.handleRequest("tabId", tabId);
BrowserApi.handleRequest("translate", handleTranslate);
BrowserApi.handleRequest("tts", tts);

if (Platform.IS_IOS) {
  BrowserApi.handleActionClicked(onActionClick);
}


Config.onChange(updateStateEnabledBadge);




// expose object to window for debugging purposes
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

self.backend = Backend;
self.AnkiApi = AnkiApi;
self.Api = BrowserApi;
self.Utils = Utils;
self.Config = Config;
self.maybeInitBackend = maybeInitBackend;
