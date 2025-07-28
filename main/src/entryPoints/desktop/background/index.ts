/**
 * Background worker for extension
 *
 * loaded on desktop / ios
 */

import DisabledIcon from "@/assets/icon128-20a.png";
import DefaultIcon from "@/assets/static/images/icon128.png";
import { Config } from "@/features/config";
import type { DesktopCtx } from "@/features/ctx";
import {
  ExtensionStreamListener,
  handleBrowserLoad,
  setActionIcon,
  setBadge,
} from "@/features/extension";
import { ExtensionMessageListener } from "@/features/extension/message";
import Utils, { DeferredWithProgress, exposeGlobals, LazyAsync } from "@/features/utils";
import { type DesktopAnkiApi, type DesktopExtensionStream } from "@/platform/desktop";
import { createBackgroundDesktopCtx } from "@/platform/desktop/background/ctx";
import type { DesktopExtensionMessage } from "@/platform/desktop/message";
import { derived } from "svelte/store";

const lazyInitialize = new LazyAsync(() => initialize());

async function initialize(): Promise<DesktopCtx> {
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
  return ctx;
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

handleBrowserLoad(() => {
  void initialize();
});

ExtensionMessageListener.init<DesktopExtensionMessage>()
  .on("DesktopPlatform.setStore", async (req) => {
    const ctx = await lazyInitialize.get();
    return ctx.platform.setStore(req.key, req.value);
  })
  .on("DesktopPlatform.setStoreBatch", async (req) => {
    const ctx = await lazyInitialize.get();
    return ctx.platform.setStoreBatch(req);
  })
  .on("DesktopPlatform.getStore", async (req) => {
    const ctx = await lazyInitialize.get();
    return ctx.platform.getStore(req);
  })
  .on("DesktopPlatform.getStoreBatch", async (req) => {
    const ctx = await lazyInitialize.get();
    return ctx.platform.getStoreBatch(req);
  })
  .on("DesktopPlatform.migrateConfig", async () => {
    const ctx = await lazyInitialize.get();
    return ctx.platform.migrateConfig();
  })
  .on("DesktopPlatform.playTTS", async (req) => {
    const ctx = await lazyInitialize.get();
    return ctx.platform.playTTS(req);
  })
  .on("DesktopPlatform.translate", async (req) => {
    const ctx = await lazyInitialize.get();
    return ctx.platform.translate(req);
  })
  .on("DesktopAnkiApi.addNote", async (req) => {
    const ctx = await lazyInitialize.get();
    return ctx.anki.addNote(req);
  })
  .on("DesktopAnkiApi.ankiInfo", async () => {
    const ctx = await lazyInitialize.get();
    return ctx.anki.getAnkiInfo();
  })
  .on("DesktopAnkiApi.checkConnection", async () => {
    const ctx = await lazyInitialize.get();
    return ctx.anki.checkConnection();
  })
  .on("DesktopAnkiApi.requestAnkiInfo", async () => {
    const ctx = await lazyInitialize.get();
    return ctx.anki.requestAnkiInfo();
  })
  .on("DesktopBackend.getDictMetadata", async () => {
    const ctx = await lazyInitialize.get();
    return ctx.backend.getDictMetadata();
  })
  .on("DesktopBackend.search", async (req) => {
    const ctx = await lazyInitialize.get();
    return ctx.backend.search(req);
  })
  .on("DesktopBackend.tokenize", async (req) => {
    const ctx = await lazyInitialize.get();
    return ctx.backend.tokenize(req);
  })
  .done()
  .verify();

ExtensionStreamListener.init<DesktopExtensionStream>()
  .on("DesktopBackend.updateDictionary", () => {
    return DeferredWithProgress.execute<boolean, string>(
      "Initializing background script...",
      async (setProgress) => {
        const ctx = await lazyInitialize.get();
        return await ctx.backend.updateDictionary().await(setProgress);
      },
    );
  });
