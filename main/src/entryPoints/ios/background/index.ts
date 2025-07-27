/**
 * Background worker for extension
 *
 * loaded on desktop / ios
 */

import DisabledIcon from "@/assets/icon128-20a.png";
import DefaultIcon from "@/assets/static/images/icon128.png";
import { Config } from "@/features/config";
import {
  ExtensionMessaging,
  handleBrowserLoad,
  handleExtensionMessage,
  listenExtensionMessage,
  type MessageSender,
  setActionIcon,
} from "@/features/extension";
import Utils, { exposeGlobals } from "@/features/utils";
import { createIosBackgroundCtx } from "@/platform/ios/background/ctx";

const _initialized: Promise<void> = initialize();

async function initialize(): Promise<void> {
  const { lazyConfig, ...ctx } = createIosBackgroundCtx();
  const config = await lazyConfig.get();
  updateStateEnabledIcon(config);

  exposeGlobals({
    Platform: ctx.platform,
    Backend: ctx.backend,
    AnkiApi: ctx.anki,
    Utils,
    config,
  });
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

const tabIdMessaging = new ExtensionMessaging<void, number | undefined>("ios.background.tabId");
tabIdMessaging.handle(tabId);

handleBrowserLoad(() => {
  void initialize();
});

listenExtensionMessage(async (message, sender, sendResponse) => {
  const resp = await handleExtensionMessage(message, sender);
  if (resp !== null) {
    sendResponse(resp);
  }
});
