/// For IOS

import { BrowserApi } from "~/extension/browserApi";

/// Used for x-callback-url as x-success value to return back to current page.
async function goToLastTab() {
  const currentTab = await BrowserApi.currentTab();
  if (currentTab === undefined || currentTab.id === undefined) {
    throw new Error("Failed to get current tab id (Unreachable)");
  }
  const tabId = await BrowserApi.getStorage<number | null>(
    "x-callback.tabId",
    null
  );
  if (tabId !== null) {
    await BrowserApi.goToTab(tabId);
  }
  // if tabId is undefined, just close this tab
  await BrowserApi.removeTab(currentTab.id);
}

BrowserApi.initialize({ context: "page" });
goToLastTab();
