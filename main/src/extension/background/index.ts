/**
 * Background worker for extension
 *
 * loaded on desktop / ios
 */

import {
  type TokenizeResult,
  type TokenizeRequest,
  type SearchRequest,
  Backend,
} from "@platform/backend";
import {
  handleBrowserLoad,
  handleMessage,
  setActionIcon,
  setBadge,
  type MessageSender,
} from "extension/browserApi";
import { ExtensionPlatform as Platform } from "@platform";
import Utils, { exposeGlobals } from "../../lib/utils";
import type { AnkiNote } from "lib/anki";
import { Config } from "lib/config";
import DefaultIcon from "assets/static/images/icon128.png";
import DisabledIcon from "assets/icon128-20a.png";
import { derived } from "svelte/store";
import { AnkiApi, type DesktopAnkiApi } from "@platform/anki";

const _initialized: Promise<void> = initialize();

async function initialize(): Promise<void> {
  const config = await Config.instance.get();
  updateStateEnabledIcon(config);
  updateDeferredNoteCountBadge(config);

  if (Platform.IS_DESKTOP) {
    const ankiApi = (await AnkiApi.instance.get()) as DesktopAnkiApi;
    runAddDeferredNoteTaskInBackground(ankiApi);
  }
}

async function searchTerm(req: SearchRequest): Promise<TokenizeResult> {
  const backend = await Backend.instance.get();
  return await backend.search(req.term, req.charAt);
}

async function tokenize(req: TokenizeRequest): Promise<TokenizeResult> {
  const backend = await Backend.instance.get();
  return await backend.tokenize(req.text, req.charAt);
}

async function addAnkiNote(note: AnkiNote): Promise<boolean> {
  const ankiApi = await AnkiApi.instance.get();
  return await ankiApi.addNote(note);
}

function tabId(_req: void, sender: MessageSender): number | undefined {
  return sender.tab?.id;
}

function updateStateEnabledIcon(config: Config) {
  const enabledStore = config.store("state.enabled");
  enabledStore.subscribe((enabled) => {
    const icon = enabled ? DefaultIcon : DisabledIcon;
    void setActionIcon(icon);
  });
}

function updateDeferredNoteCountBadge(config: Config) {
  const deferredNotes = config.store("state.anki.deferred_note_count");
  const deferErrored = config.store("state.anki.deferred_note_error");
  const notesAndErrors = derived([deferredNotes, deferErrored], (a) => a);
  notesAndErrors.subscribe(([cnt, errored]) => {
    if (cnt === 0) {
      void setBadge("");
    } else {
      void setBadge(cnt, errored ? "red" : "#cccccc");
    }
  });
}

/** Check and add Anki notes every 30 seconds */
function runAddDeferredNoteTaskInBackground(ankiApi: DesktopAnkiApi) {
  setInterval(() => {
    void ankiApi.addDeferredNotes();
  }, 1000 * 30);
}

async function getDictCreationDate() {
  const backend = await Backend.instance.get();
  return await backend.getDictCreationDate();
}

handleMessage("searchTerm", searchTerm);
handleMessage("tokenize", tokenize);
handleMessage("addAnkiNote", addAnkiNote);
handleMessage("tabId", tabId);
handleMessage("getDictCreationDate", getDictCreationDate);

handleBrowserLoad(() => {
  void initialize();
});

exposeGlobals({
  Platform,
  Utils,
  ankiApi: AnkiApi.instance,
  backend: Backend.instance,
  config: Config.instance,
});
