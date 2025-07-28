// Re-export all messaging functions and types
export {
  type ExtensionMessage,
  ExtensionMessageListener,
  type MessageHandler,
  type MessageSender,
} from "./message";

// Re-export all browser API functions and types
export {
  activeTab,
  type ApiInitializeOptions,
  browserAction,
  browserStorage,
  currentTab,
  currentTabId,
  type ExecutionContext,
  extensionManifest,
  getStorage,
  getTabs,
  goToTab,
  handleActionClicked,
  handleBrowserLoad,
  handleInstall,
  handleStorageChange,
  japaneseTtsVoices,
  type Port,
  removeStorage,
  removeTab,
  setActionIcon,
  setBadge,
  setStorage,
  speakJapanese,
  type StorageHandler,
  type StorageKey,
  updateTab,
} from "./browserApi";

export { type ExtensionStream, ExtensionStreamListener, type StreamByKey } from "./stream";
