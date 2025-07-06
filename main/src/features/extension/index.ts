// Re-export all messaging functions and types
export {
  BackgroundFunction,
  handleMessage,
  type MessageHandlerForKey as MessageHandler,
  type MessageMap,
  type MessageRequest,
  type MessageResponse,
  type MessageSender,
  messageToAllTabs,
  messageToTab,
  NonContentScriptFunction,
  sendMessage,
} from "./message";

// Re-export all browser API functions and types
export {
  activeTab,
  type ApiInitializeOptions,
  browserAction,
  browserStorage,
  createConnection,
  currentTab,
  currentTabId,
  type ExecutionContext,
  extensionManifest,
  getStorage,
  getTabs,
  goToTab,
  handleActionClicked,
  handleBrowserLoad,
  handleConnection,
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

// For backward compatibility, also export message as 'message'
export { sendMessage as message } from "./message";
