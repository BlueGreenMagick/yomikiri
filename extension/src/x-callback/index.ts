/// For IOS

import Api from "~/api";
import Config from "~/config";

/// Used for x-callback-url as x-success value to return back to current page.
async function goToLastTab() {
  const currentTab = await Api.currentTab();
  if (currentTab === undefined || currentTab.id === undefined) {
    throw new Error("Failed to get current tab id (Unreachable)");
  }
  const tabId = await Config.get("x-callback.tabId");
  if (tabId !== null) {
    await Config.set("x-callback.successTabId", tabId);
    await Api.goToTab(tabId);
  }
  // if tabId is undefined, just close this tab
  await Api.removeTab(currentTab.id);
}

Api.initialize({ context: "page" }).then(() => {
  goToLastTab();
});
