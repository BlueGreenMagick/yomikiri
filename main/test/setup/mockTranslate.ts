import { vi } from "vitest";
import type { TranslateResult } from "platform/common/translate";

vi.mock(
  "platform/common/translate.ts",
  async (
    importOriginal,
  ): Promise<typeof import("platform/common/translate.ts")> => {
    const module: typeof import("platform/common/translate.ts") =
      await importOriginal();
    return {
      ...module,
      getTranslation,
    };
  },
);

async function getTranslation(text: string): Promise<TranslateResult> {
  await Promise.resolve();

  return {
    translated: `translation: ${text}`,
  };
}
