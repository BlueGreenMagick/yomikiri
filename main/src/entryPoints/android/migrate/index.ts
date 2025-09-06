import { migrate } from "@/features/compat/migrate";
import { exposeGlobals } from "@/features/utils";
import { createAndroidCtx } from "@/platform/android";

async function initialize(): Promise<void> {
  const ctx = createAndroidCtx();

  exposeGlobals({
    Platform: ctx.platform,
    Backend: ctx.backend,
  });

  await migrate(ctx.platform);
}

void initialize();
