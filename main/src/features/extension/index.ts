// Re-export all messaging functions and types
export {
  handleMessage,
  sendMessage,
  messageToTab,
  messageToAllTabs,
  BackgroundFunction,
  NonContentScriptFunction,
  type MessageMap,
  type MessageRequest,
  type MessageResponse,
  type MessageSender,
  type MessageHandler,
} from "./message";

// Re-export all browser API functions and types
export {
  browserAction,
  browserStorage,
  extensionManifest,
  setActionIcon,
  handleActionClicked,
  handleBrowserLoad,
  setBadge,
  japaneseTtsVoices,
  speakJapanese,
  currentTabId,
  activeTab,
  getTabs,
  goToTab,
  removeTab,
  updateTab,
  currentTab,
  getStorage,
  setStorage,
  removeStorage,
  handleStorageChange,
  createConnection,
  handleConnection,
  handleInstall,
  type StorageHandler,
  type ExecutionContext,
  type Port,
  type ApiInitializeOptions,
  type StorageKey,
} from "./browserApi";

// For backward compatibility, also export message as 'message' 
export { sendMessage as message } from "./message";