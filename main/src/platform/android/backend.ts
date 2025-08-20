import type { ProgressTask } from "@/features/utils";
import type {
  DictionaryMetadata,
  SearchArgs,
  TokenizeArgs,
  TokenizeResult,
} from "@yomikiri/backend-bindings";
import { cleanTokenizeResult, emptyTokenizeResult } from "../shared/backend";
import type { RunAppArgType, RunAppCommandKeys, RunAppReturnType } from "../shared/runApp";
import type { IBackend, SearchRequest, TokenizeRequest } from "../types/backend";
import { sendMessage } from "./messaging";

export class AndroidBackend implements IBackend {
  readonly type = "android";

  async tokenize({ text, charAt }: TokenizeRequest): Promise<TokenizeResult> {
    charAt = charAt ?? 0;

    if (text === "") {
      return emptyTokenizeResult();
    }
    if (charAt < 0 || charAt >= text.length) {
      throw new RangeError(`charAt is out of range: ${charAt}, ${text}`);
    }

    const req: TokenizeArgs = { sentence: text, char_idx: charAt };
    const result = await sendMessage("tokenize", req);
    cleanTokenizeResult(result);
    return result;
  }

  async search({ term, charAt }: SearchRequest): Promise<TokenizeResult> {
    charAt = charAt ?? 0;

    if (term === "") {
      return emptyTokenizeResult();
    }
    if (charAt < 0 || charAt >= term.length) {
      throw new RangeError(`charAt is out of range: ${charAt}, ${term}`);
    }

    const req: SearchArgs = { query: term, char_idx: charAt };
    const result = await sendMessage("search", req);
    cleanTokenizeResult(result);
    return result;
  }

  getDictMetadata(): Promise<DictionaryMetadata> {
    return sendMessage("metadata", null);
  }

  /** TODO */
  updateDictionary(): ProgressTask<boolean, string> {
    throw new Error("Unimplemented");
  }

  private async runApp<C extends RunAppCommandKeys>(
    cmd: C,
    args: RunAppArgType<C>,
  ): Promise<RunAppReturnType<C>> {
    const result = await sendMessage("runApp", { cmd, args });
    return result as RunAppReturnType<C>;
  }
}
