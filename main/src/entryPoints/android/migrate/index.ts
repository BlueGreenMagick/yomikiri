import { migrate } from "@/features/compat/migrate";
import { exposeGlobals, getErrorMessage } from "@/features/utils";
import { createAndroidCtx } from "@/platform/android";

async function initialize(): Promise<void> {
  const ctx = createAndroidCtx();

  exposeGlobals({
    Platform: ctx.platform,
    Backend: ctx.backend,
  });

  await migrate(ctx.platform);
}

void initialize().catch((err: unknown) => {
  document.body.innerText = getErrorMessage(err);
});
