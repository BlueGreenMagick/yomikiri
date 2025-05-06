/**
 * Background worker for extension
 *
 * loaded on desktop / ios
 */

import {
  handleBrowserLoad,
  handleMessage,
  setActionIcon,
  setBadge,
  type MessageSender,
} from "@/features/extension/browserApi";
import {
  ExtensionPlatform as Platform,
  type DesktopPlatform,
  type IosPlatform,
} from "#platform";
import Utils, { exposeGlobals } from "@/features/utils";
import { Config } from "@/features/config";
import DefaultIcon from "@/assets/static/images/icon128.png";
import DisabledIcon from "@/assets/icon128-20a.png";
import { derived } from "svelte/store";

const _initialized: Promise<void> = initialize();

async function initialize(): Promise<void> {
  const platform = Platform;
  const config = await Config.instance.get();
  updateStateEnabledIcon(config);
  updateDeferredNoteCountBadge(config);
  runAddDeferredNoteTaskInBackground(platform);
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

function updateDeferredNoteCountBadge(config: Config) {
  const deferredNotes = config.store("state.anki.deferred_note_count");
  const deferErrored = config.store("state.anki.deferred_note_error");
  const notesAndErrors = derived([deferredNotes, deferErrored], (a) => a);
  notesAndErrors.subscribe(([cnt, errored]) => {
    if (cnt === 0) {
      void setBadge("");
    } else {
      void setBadge(cnt, errored ? "red" : "#cccccc");
    }
  });
}

/**
 * Check and add Anki notes every 30 seconds in desktop.
 */
function runAddDeferredNoteTaskInBackground(
  platform: DesktopPlatform | IosPlatform,
) {
  if (platform.type === "desktop") {
    const ankiApi = platform.anki;
    setInterval(() => {
      void ankiApi.addDeferredNotes();
    }, 1000 * 30);
  }
}

handleMessage("tabId", tabId);

handleBrowserLoad(() => {
  void initialize();
});

exposeGlobals({
  Platform,
  Utils,
  config: Config.instance,
});
