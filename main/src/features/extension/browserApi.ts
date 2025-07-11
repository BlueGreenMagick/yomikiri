import type { AnkiNote } from "@/features/anki";
import type { StoredCompatConfiguration } from "@/features/compat";
import { YomikiriError } from "@/features/error";
import { createPromise } from "@/features/utils";
import type { TTSVoice } from "@/platform/types";

export type StorageHandler = (change: chrome.storage.StorageChange) => void;

export type ExecutionContext =
  | "contentScript"
  | "background"
  | "page"
  | "popup";

export type Port = chrome.runtime.Port;

export interface ApiInitializeOptions {
  handleRequests?: boolean;
  handleStorageChange?: boolean;
  handleConnection?: boolean;
  context: ExecutionContext;
}

/// Must not contain 'undefined'
interface StorageValues {
  config: StoredCompatConfiguration;
  // desktop
  "deferred-anki-note": AnkiNote[];
  "deferred-anki-note-errors": string[];
  "dict.schema_ver": number;
  /** ETag of jmdict response */
  "dict.jmdict.etag": string;
  "dict.jmnedict.etag": string;
  // ios
  "x-callback.tabId": number;
  "x-callback.tabUrl": string;
}

export type StorageKey = keyof StorageValues;

const _storageHandlers: Record<string, StorageHandler[]> = {};

let _tabId: number | undefined;

/** returns chrome.action on manifest v3, and chrome.browserAction on manifest v2 */
export function browserAction():
  | typeof chrome.action
  | typeof chrome.browserAction
{
  return chrome.action ?? chrome.browserAction;
}

export function browserStorage(): chrome.storage.StorageArea {
  return chrome.storage.local;
}

export function extensionManifest(): chrome.runtime.Manifest {
  return chrome.runtime.getManifest();
}

export async function setActionIcon(iconPath: string) {
  await browserAction().setIcon({
    path: iconPath,
  });
}

export function handleActionClicked(handler: (tab: chrome.tabs.Tab) => void) {
  browserAction().onClicked.addListener(handler);
}

export function handleBrowserLoad(handler: () => void) {
  chrome.runtime.onStartup.addListener(handler);
}

/** set text to "" to remove badge */
export async function setBadge(text: string | number, color: string = "white") {
  const iAction = browserAction();
  if (typeof text === "number") {
    text = text.toString();
  }
  await iAction.setBadgeText({
    text,
  });
  await iAction.setBadgeBackgroundColor({
    color,
  });
}

export async function japaneseTtsVoices(): Promise<TTSVoice[]> {
  if (chrome.tts === undefined) {
    return [];
  }

  const [promise, resolve] = createPromise<chrome.tts.TtsVoice[]>();
  chrome.tts.getVoices(resolve);
  const voices = await promise;
  const ttsVoices: TTSVoice[] = [];
  for (const voice of voices) {
    if (voice.lang != "ja-JP") continue;
    const name = voice.voiceName;
    if (name === undefined) continue;
    const quality = voice.remote ? 100 : 200;
    const ttsVoice: TTSVoice = {
      id: name,
      name: name,
      quality,
    };
    ttsVoices.push(ttsVoice);
  }
  return ttsVoices;
}

export async function speakJapanese(
  text: string,
  voice: TTSVoice | null,
): Promise<void> {
  const [promise, resolve] = createPromise<void>();
  let options: chrome.tts.TtsOptions = { lang: "ja-jp" };
  if (voice !== null) {
    const voices = await japaneseTtsVoices();
    if (voices.find((value) => value.name === voice.name) !== undefined) {
      options = { voiceName: voice.name };
    }
  }
  chrome.tts.speak(text, options, resolve);
  return promise;
}

export async function currentTabId(): Promise<number> {
  if (_tabId === undefined) {
    const tab = await currentTab();
    if (tab.id === undefined) {
      throw new YomikiriError("Current tab does not have an id");
    }
    _tabId = tab.id;
  }
  return _tabId;
}

/** Must not be called from a content script. */
export async function activeTab(): Promise<chrome.tabs.Tab> {
  const [promise, resolve, reject] = createPromise<chrome.tabs.Tab>();
  const info = {
    active: true,
    currentWindow: true,
  };

  chrome.tabs.query(info, (result: chrome.tabs.Tab[]) => {
    if (result[0] !== undefined) {
      resolve(result[0]);
    } else {
      reject(new YomikiriError("No tabs are active"));
    }
  });
  return promise;
}

export async function getTabs(
  info: chrome.tabs.QueryInfo,
): Promise<chrome.tabs.Tab[]> {
  const [promise, resolve] = createPromise<chrome.tabs.Tab[]>();
  chrome.tabs.query(info, (tabs: chrome.tabs.Tab[]) => {
    resolve(tabs);
  });
  return promise;
}

export async function goToTab(tabId: number): Promise<void> {
  const [promise, resolve] = createPromise<void>();
  chrome.tabs.update(tabId, { active: true }, () => {
    resolve();
  });
  return promise;
}

export async function removeTab(tabId: number): Promise<void> {
  const [promise, resolve] = createPromise<void>();
  chrome.tabs.remove(tabId, () => {
    resolve();
  });
  return promise;
}

export async function updateTab(
  tabId: number,
  properties: chrome.tabs.UpdateProperties,
): Promise<void> {
  const [promise, resolve] = createPromise<void>();
  chrome.tabs.update(tabId, properties, () => {
    resolve();
  });
  return promise;
}

/** Must be called from within a tab, and not in a content script */
export async function currentTab(): Promise<chrome.tabs.Tab> {
  const [promise, resolve, reject] = createPromise<chrome.tabs.Tab>();
  chrome.tabs.getCurrent((result: chrome.tabs.Tab | undefined) => {
    if (result === undefined) {
      reject(new YomikiriError("Could not get current tab"));
    } else {
      resolve(result);
    }
  });
  return promise;
}

/**
 * `or = undefined` is returned if storage value is `undefined` of not set.
 */
export async function getStorage<K extends StorageKey, V = undefined>(
  key: K,
  or?: V,
): Promise<StorageValues[K] | V> {
  const [promise, resolve] = createPromise<StorageValues[K] | V>();
  browserStorage().get(key, (obj) => {
    const value = obj[key] as StorageValues[K] | undefined;
    if (or !== undefined && value === undefined) {
      resolve(or);
    } else {
      resolve(value as StorageValues[K]);
    }
  });
  return promise;
}

export async function setStorage<K extends keyof StorageValues>(
  key: K,
  value: StorageValues[K],
) {
  const [promise, resolve] = createPromise<void>();
  const object: Record<string, unknown> = {};
  object[key] = value;
  browserStorage().set(object, resolve);
  return promise;
}

export async function removeStorage(key: keyof StorageValues) {
  const [promise, resolve] = createPromise<void>();
  browserStorage().remove(key, resolve);
  return promise;
}

export function handleStorageChange(key: string, handler: StorageHandler) {
  const storageHandlers = _storageHandlers[key];
  if (storageHandlers !== undefined) {
    storageHandlers.push(handler);
  } else {
    _storageHandlers[key] = [handler];
  }
}

export function handleInstall(
  handler: (details: chrome.runtime.InstalledDetails) => void,
) {
  chrome.runtime.onInstalled.addListener(handler);
}

browserStorage().onChanged.addListener((changes) => {
  for (const key in changes) {
    const handlers = _storageHandlers[key];
    if (handlers === undefined) continue;
    for (const handler of handlers) {
      handler(changes[key]);
    }
  }
});
