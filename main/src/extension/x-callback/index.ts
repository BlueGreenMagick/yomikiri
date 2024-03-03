/// For IOS

import { BrowserApi } from "~/extension/browserApi";

/** 
 * Used for x-callback-url as x-success value to return back to current page. 
 * 
 * Last tab finding process:
 * 1. Identical tabId and Url
 * 2. Last tab with tab url
 * 3. tabId
 */
async function getLastTabId(): Promise<number | null> {
  const tabId = await BrowserApi.getStorage<number | null>(
    "x-callback.tabId",
    null
  );
  const tabUrl = await BrowserApi.getStorage<string | null>(
    "x-callback.tabUrl",
    null
  );
  
  if (tabId === null || tabUrl === null) {
    // if tabId is undefined, just close this tab
    return null
  }

  const tabs = await BrowserApi.tabs({url: tabUrl});

  // if tab exists with correct (tabId, tabUrl), return the tab.
  for (const tab of tabs) {
    if (tab.id == tabId) {
      return tabId
    }
  }

  // if no such tab exist, return other tab with identical url.
  // maybe safari has restarted and assigned different id to the tab.
  for (let i = tabs.length - 1; i >= 0 ; i--) {
    const tab = tabs[i];
    if (tab.id !== undefined) {
      return tab.id
    }
  }

  // Maybe the user moved to another url or something.
  return tabId
}



async function main() {
  const currentTab = await BrowserApi.currentTab();
  if (currentTab === undefined || currentTab.id === undefined) {
    throw new Error("Failed to get current tab id (Unreachable)");
  }
  
  try {
    let lastTabId = await getLastTabId();
    if (lastTabId !== null) {
      await BrowserApi.goToTab(lastTabId);
    }
  } catch (e) {}

  await BrowserApi.removeTab(currentTab.id);
}

BrowserApi.initialize({ context: "page" });
main();
