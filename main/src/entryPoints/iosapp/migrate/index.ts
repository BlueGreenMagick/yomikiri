import { migrate } from "@/features/compat/migrate";
import { exposeGlobals } from "@/features/utils";
import { createIosAppCtx } from "@/platform/iosapp";

async function initialize(): Promise<void> {
  const ctx = createIosAppCtx();

  exposeGlobals({
    Platform: ctx.platform,
    Backend: ctx.backend,
  });

  await migrate(ctx.platform);
}

void initialize();
