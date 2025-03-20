import type { RunArgTypes, RunReturnTypes } from "@yomikiri/backend-bindings";
import type { TokenizeResult } from "@yomikiri/yomikiri-rs";
import { getValidEntriesForSurface } from "lib/dicEntry";
import { toHiragana } from "lib/japanese";

export type RunMessageMap = {
  [K in keyof RunArgTypes]: [RunArgTypes[K], RunReturnTypes[K]];
};

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
