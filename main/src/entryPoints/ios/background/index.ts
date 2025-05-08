/**
 * Background worker for extension
 *
 * loaded on desktop / ios
 */

import {
  handleBrowserLoad,
  handleMessage,
  setActionIcon,
  type MessageSender,
} from "@/features/extension/browserApi";
import { IosPlatform } from "@/platform/ios";
import Utils, { exposeGlobals } from "@/features/utils";
import { Config } from "@/features/config";
import DefaultIcon from "@/assets/static/images/icon128.png";
import DisabledIcon from "@/assets/icon128-20a.png";

const _initialized: Promise<void> = initialize();

async function initialize(): Promise<void> {
  const config = await Config.instance.get();
  updateStateEnabledIcon(config);
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

handleMessage("tabId", tabId);

handleBrowserLoad(() => {
  void initialize();
});

exposeGlobals({
  Platform: IosPlatform,
  Utils,
  config: Config.instance,
});
