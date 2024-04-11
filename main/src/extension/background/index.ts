/**
 * Background worker for extension
 * 
 * loaded on desktop / ios
 */

import type { Entry } from "../../dicEntry";
import { type TokenizeResult, type TokenizeRequest, type DesktopBackend, type IosBackend } from "@platform/backend";
import { BrowserApi, type MessageSender } from "~/extension/browserApi";
import { Platform, type ExtensionPlatform, type TTSRequest, type TranslateResult } from "@platform";
import Utils, { exposeGlobals } from "../../utils";
import type { NoteData } from "~/ankiNoteBuilder";
import Config from "~/config";
import { updateTTSAvailability } from "~/common";

const browserApi = new BrowserApi({ context: "background" })
const platform = new Platform(browserApi) as ExtensionPlatform
const lazyConfig = new Utils.LazyAsync(() => Config.initialize(platform))
const lazyAnkiApi = new Utils.LazyAsync(async () => platform.newAnkiApi(await lazyConfig.get()))
const lazyBackend = new Utils.LazyAsync<DesktopBackend | IosBackend>(() => platform.newBackend())

const _initialized: Promise<void> = initialize();

async function initialize(): Promise<void> {
  const config = await lazyConfig.get()
  config.onChange(() => { updateStateEnabledBadge(config) });

  await updateTTSAvailability(platform, config);
}


async function searchTerm(term: string): Promise<Entry[]> {
  const backend = await lazyBackend.get();
  return await backend.search(term);
}

async function tokenize(req: TokenizeRequest): Promise<TokenizeResult> {
  const backend = await lazyBackend.get();
  return await backend.tokenize(req.text, req.charAt);
}

async function addAnkiNote(note: NoteData): Promise<void> {
  const ankiApi = await lazyAnkiApi.get()
  await ankiApi.addNote(note);
}

function tabId(_req: null, sender: MessageSender): number | undefined {
  return sender.tab?.id;
}

async function handleTranslate(req: string): Promise<TranslateResult> {
  return await platform.translate(req);
}

function updateStateEnabledBadge(config: Config) {
  const enabled = config.get("state.enabled");
  const text = enabled ? "" : "off";
  browserApi.setBadge(text, "#999999");
}

async function tts(req: TTSRequest): Promise<void> {
  await platform.playTTS(req.text, req.voice)
}

/** On ios, toggle state.enabled when action item is clicked */
async function onActionClick() {
  const config = await lazyConfig.get();
  const prevEnabled = config.get("state.enabled");
  const enabled = !prevEnabled;
  config.set("state.enabled", enabled);
}


browserApi.handleRequest("searchTerm", searchTerm);
browserApi.handleRequest("tokenize", tokenize);
browserApi.handleRequest("addAnkiNote", addAnkiNote);
browserApi.handleRequest("tabId", tabId);
browserApi.handleRequest("translate", handleTranslate);
browserApi.handleRequest("tts", tts);

if (Platform.IS_IOS) {
  browserApi.handleActionClicked(onActionClick);
}


exposeGlobals({
  platform,
  browserApi,
  Utils,
  ankiApi: () => {
    void lazyAnkiApi.get()
    return lazyAnkiApi.getIfInitialized()
  },
  backend: () => {
    void lazyBackend.get()
    return lazyBackend.getIfInitialized()
  },
  config: () => {
    void lazyConfig.get()
    return lazyConfig.getIfInitialized()
  }
})