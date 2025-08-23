import { getValidEntriesForSurface } from "@/features/dicEntry";
import { toHiragana } from "@/features/japanese";
import type { TokenizeResult } from "@yomikiri/backend-bindings";

export function cleanTokenizeResult(res: TokenizeResult) {
  res.tokens.forEach((token) => {
    const reading = token.reading === "*" ? token.text : token.reading;
    token.reading = toHiragana(reading);
  });

  const selectedToken = res.tokens[res.tokenIdx];
  if (res.tokenIdx >= 0) {
    res.entries = getValidEntriesForSurface(res.entries, selectedToken.text);
  }
  console.debug(res);
}

export function emptyTokenizeResult(): TokenizeResult {
  return {
    tokenIdx: -1,
    tokens: [],
    entries: [],
    grammars: [],
  };
}
