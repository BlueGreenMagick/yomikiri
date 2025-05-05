import { vi } from "vitest";
import type { TranslateResult } from "@/platform/shared/translate";

vi.mock(
  "@/platform/shared/translate.ts",
  async (
    importOriginal,
  ): Promise<typeof import("@/platform/shared/translate.ts")> => {
    const module: typeof import("@/platform/shared/translate.ts") =
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
