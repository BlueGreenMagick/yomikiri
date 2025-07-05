/**
 * Background worker for extension
 *
 * loaded on desktop / ios
 */

import DisabledIcon from "@/assets/icon128-20a.png";
import DefaultIcon from "@/assets/static/images/icon128.png";
import { Config } from "@/features/config";
import {
  handleBrowserLoad,
  handleMessage,
  type MessageSender,
  setActionIcon,
  setBadge,
} from "@/features/extension/browserApi";
import Utils, { exposeGlobals } from "@/features/utils";
import { createBackgroundDesktopCtx, type DesktopAnkiApi } from "@/platform/desktop";
import { derived } from "svelte/store";

const _initialized: Promise<void> = initialize();

async function initialize(): Promise<void> {
  const ctx = createBackgroundDesktopCtx();
  const config = await ctx.lazyConfig.get();
  updateStateEnabledIcon(config);
  updateDeferredNoteCountBadge(config);
  runAddDeferredNoteTaskInBackground(ctx.anki);

  exposeGlobals({
    Platform: ctx.platform,
    AnkiApi: ctx.anki,
    Backend: ctx.backend,
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
function runAddDeferredNoteTaskInBackground(ankiApi: DesktopAnkiApi) {
  setInterval(() => {
    void ankiApi.addDeferredNotes();
  }, 1000 * 30);
}

handleMessage("tabId", tabId);

handleBrowserLoad(() => {
  void initialize();
});
