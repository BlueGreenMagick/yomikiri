/**
 * Background worker for extension
 *
 * loaded on desktop / ios
 */

import DisabledIcon from "@/assets/icon128-20a.png";
import DefaultIcon from "@/assets/static/images/icon128.png";
import { Config } from "@/features/config";
import type { ConfigCtx, IosCtx } from "@/features/ctx";
import { ExtensionStreamListener, handleBrowserLoad, setActionIcon } from "@/features/extension";
import { ExtensionMessageListener } from "@/features/extension/message";
import Utils, { exposeGlobals, LazyAsync } from "@/features/utils";
import type { IosExtensionMessage, IosExtensionStream } from "@/platform/ios";
import { createIosBackgroundCtx } from "@/platform/ios/background/ctx";

const lazyCtx = new LazyAsync(() => initializeCtx());

async function initializeCtx(): Promise<IosCtx & ConfigCtx> {
  const ctx = createIosBackgroundCtx();
  const config = await ctx.lazyConfig.get();
  updateStateEnabledIcon(config);

  exposeGlobals({
    Platform: ctx.platform,
    Backend: ctx.backend,
    AnkiApi: ctx.anki,
    Utils,
    config,
  });

  return {
    ...ctx,
    config,
  };
}

function updateStateEnabledIcon(config: Config) {
  const enabledStore = config.store("state.enabled");
  enabledStore.subscribe((enabled) => {
    const icon = enabled ? DefaultIcon : DisabledIcon;
    void setActionIcon(icon);
  });
}

ExtensionMessageListener.init<IosExtensionMessage>()
  .on("IosPlatform.getConfig", async () => {
    const ctx = await lazyCtx.get();
    return ctx.platform.getConfig();
  })
  .on("IosPlatform.migrateConfig", async () => {
    const ctx = await lazyCtx.get();
    return ctx.platform.migrateConfig();
  })
  .on("IosPlatform.playTTS", async (req) => {
    const ctx = await lazyCtx.get();
    return ctx.platform.playTTS(req);
  })
  .on("IosPlatform.saveConfig", async (req) => {
    const ctx = await lazyCtx.get();
    return ctx.platform.saveConfig(req);
  })
  .on("IosPlatform.translate", async (req) => {
    const ctx = await lazyCtx.get();
    return ctx.platform.translate(req);
  })
  .on("IosPlatform.japaneseTTSVoices", async () => {
    const ctx = await lazyCtx.get();
    return ctx.platform.japaneseTTSVoices();
  })
  .on("IosAnkiApi.addNote", async (req) => {
    const ctx = await lazyCtx.get();
    return ctx.anki.addNote(req);
  })
  .on("IosMessaging.send", async (req) => {
    const ctx = await lazyCtx.get();
    return ctx.backend.messaging.send(req.key, req.request);
  })
  .done()
  .verify();

handleBrowserLoad(() => {
  void initializeCtx();
});

ExtensionStreamListener.init<IosExtensionStream>().done().verify();
