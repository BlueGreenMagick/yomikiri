import { migrate } from "@/features/compat/migrate";
import { exposeGlobals, getErrorMessage, logs } from "@/features/utils";
import { createIosAppCtx } from "@/platform/iosapp";

async function initialize(): Promise<void> {
  const ctx = createIosAppCtx();

  exposeGlobals({
    Platform: ctx.platform,
    Backend: ctx.backend,
    getLogs: logs,
  });

  await migrate(ctx.platform);
}

void initialize().catch((err: unknown) => {
  document.body.innerText = getErrorMessage(err);
});
