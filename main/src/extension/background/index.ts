/**
 * Background worker for extension
 *
 * loaded on desktop / ios
 */

import {
  type TokenizeResult,
  type TokenizeRequest,
  type DesktopBackend,
  type IosBackend,
  type SearchRequest,
} from "@platform/backend";
import {
  handleBrowserLoad,
  handleMessage,
  setActionIcon,
  setBadge,
  type MessageSender,
} from "extension/browserApi";
import {
  Platform,
  type ExtensionPlatform,
  type TTSRequest,
  type TranslateResult,
} from "@platform";
import Utils, { exposeGlobals } from "../../lib/utils";
import type { AnkiNote } from "lib/anki";
import Config, { type StoredConfiguration } from "lib/config";
import DefaultIcon from "assets/static/images/icon128.png";
import DisabledIcon from "assets/icon128-20a.png";
import { derived } from "svelte/store";
import type { DesktopAnkiApi } from "@platform/anki";

const platform = new Platform() as ExtensionPlatform;
const lazyConfig = new Utils.LazyAsync(() => Config.initialize(platform));
const lazyAnkiApi = new Utils.LazyAsync(async () =>
  platform.newAnkiApi(await lazyConfig.get()),
);
const lazyBackend = new Utils.LazyAsync<DesktopBackend | IosBackend>(() =>
  platform.newBackend(),
);

const _initialized: Promise<void> = initialize();

async function initialize(): Promise<void> {
  const config = await lazyConfig.get();
  updateStateEnabledIcon(config);
  updateDeferredNoteCountBadge(config);

  if (Platform.IS_DESKTOP) {
    const ankiApi = (await lazyAnkiApi.get()) as DesktopAnkiApi;
    runAddDeferredNoteTaskInBackground(ankiApi);
  }
}

async function searchTerm(req: SearchRequest): Promise<TokenizeResult> {
  const backend = await lazyBackend.get();
  return await backend.search(req.term, req.charAt);
}

async function tokenize(req: TokenizeRequest): Promise<TokenizeResult> {
  const backend = await lazyBackend.get();
  return await backend.tokenize(req.text, req.charAt);
}

async function addAnkiNote(note: AnkiNote): Promise<boolean> {
  const ankiApi = await lazyAnkiApi.get();
  return await ankiApi.addNote(note);
}

function tabId(_req: null, sender: MessageSender): number | undefined {
  return sender.tab?.id;
}

async function handleTranslate(req: string): Promise<TranslateResult> {
  return await platform.translate(req);
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

async function tts(req: TTSRequest): Promise<void> {
  await platform.playTTS(req.text, req.voice);
}

async function handleMigrateConfig(): Promise<StoredConfiguration> {
  return await platform.migrateConfig();
}

handleMessage("searchTerm", searchTerm);
handleMessage("tokenize", tokenize);
handleMessage("addAnkiNote", addAnkiNote);
handleMessage("tabId", tabId);
handleMessage("translate", handleTranslate);
handleMessage("tts", tts);
handleMessage("migrateConfig", handleMigrateConfig);

handleBrowserLoad(() => {
  void initialize();
});

exposeGlobals({
  platform,
  Utils,
  ankiApi: () => {
    void lazyAnkiApi.get();
    return lazyAnkiApi.getIfInitialized();
  },
  backend: () => {
    void lazyBackend.get();
    return lazyBackend.getIfInitialized();
  },
  config: () => {
    void lazyConfig.get();
    return lazyConfig.getIfInitialized();
  },
});
