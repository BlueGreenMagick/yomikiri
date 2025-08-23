import { type ProgressTask, toCodePointIndex } from "@/features/utils";
import { cleanTokenizeResult, emptyTokenizeResult } from "../shared/backend";
import type { CommandOf, CommandResultOf, CommandTypes } from "../shared/invoke";
import type {
  DictionaryMetadata,
  IBackend,
  SearchRequest,
  TokenizeRequest,
  TokenizeResult,
} from "../types/backend";
import type { DesktopBackendBackground } from "./background/backend";
import { startDesktopExtensionStream } from "./extensionStream";
import { sendDesktopExtensionMessage } from "./message";

/** Must be initialized synchronously on page load */
export class DesktopBackend implements IBackend {
  readonly type = "desktop";

  private constructor(
    private background: DesktopBackendBackground | null,
  ) {}

  static foreground(): DesktopBackend {
    return new DesktopBackend(null);
  }

  static background(background: DesktopBackendBackground): DesktopBackend {
    return new DesktopBackend(background);
  }

  async invoke<C extends CommandTypes>(
    command: CommandOf<C>,
  ): Promise<CommandResultOf<C>> {
    if (this.background) {
      return this.background.invoke(command);
    } else {
      const result = await sendDesktopExtensionMessage("DesktopBackend.invoke", command);
      return result as CommandResultOf<C>;
    }
  }

  async tokenize({ charAt, text }: TokenizeRequest): Promise<TokenizeResult> {
    charAt = charAt ?? 0;

    if (text === "") {
      return emptyTokenizeResult();
    }
    if (charAt < 0 || charAt >= text.length) {
      throw new RangeError(`charAt is out of range: ${charAt}, ${text}`);
    }

    const codePointAt = toCodePointIndex(text, charAt);

    const args = {
      sentence: text,
      char_idx: codePointAt,
    };
    const result = await this.invoke({ type: "Tokenize", args });
    cleanTokenizeResult(result);
    return result;
  }

  async search({ charAt, term }: SearchRequest): Promise<TokenizeResult> {
    charAt = charAt ?? 0;
    if (term === "") {
      return emptyTokenizeResult();
    }
    if (charAt < 0 || charAt >= term.length) {
      throw new RangeError(`charAt is out of range: ${charAt}, ${term}`);
    }

    const codePointAt = toCodePointIndex(term, charAt);
    const args = {
      query: term,
      char_idx: codePointAt,
    };

    const result = await this.invoke({ type: "Search", args });
    cleanTokenizeResult(result);
    return result;
  }

  getDictMetadata(): Promise<DictionaryMetadata> {
    return this.invoke({ type: "DictionaryMetadata", args: null });
  }

  updateDictionary(): ProgressTask<boolean, string> {
    if (this.background) {
      return this.background.updateDictionary();
    } else {
      return startDesktopExtensionStream(
        "DesktopBackend.updateDictionary",
        "Updating dictionary...",
      );
    }
  }
}
