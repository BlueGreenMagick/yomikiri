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
import Utils, { exposeGlobals } from "@/features/utils";
import { Config } from "@/features/config";
import DefaultIcon from "@/assets/static/images/icon128.png";
import DisabledIcon from "@/assets/icon128-20a.png";
import { createIosCtx } from "@/platform/ios/ctx";

const _initialized: Promise<void> = initialize();

async function initialize(): Promise<void> {
  const { lazyConfig, ...ctx } = createIosCtx();
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

handleMessage("tabId", tabId);

handleBrowserLoad(() => {
  void initialize();
});
