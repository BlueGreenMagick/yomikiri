import { BackgroundStreamFunction } from "@/features/extension";
import type {
  DictionaryMetadata,
  IBackend,
  SearchRequest,
  TokenizeRequest,
  TokenizeResult,
} from "../types/backend";
import type { DesktopBackendBackground } from "./background/backend";
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

  tokenize(req: TokenizeRequest): Promise<TokenizeResult> {
    if (this.background) {
      return this.background.tokenize(req);
    } else {
      return sendDesktopExtensionMessage("DesktopBackend.tokenize", req);
    }
  }

  search(req: SearchRequest): Promise<TokenizeResult> {
    if (this.background) {
      return this.background.search(req);
    } else {
      return sendDesktopExtensionMessage("DesktopBackend.search", req);
    }
  }

  getDictMetadata(): Promise<DictionaryMetadata> {
    if (this.background) {
      return this.background.getDictMetadata();
    } else {
      return sendDesktopExtensionMessage("DesktopBackend.getDictMetadata", undefined);
    }
  }
  /** Returns `false` if already up-to-date. Otherwise, returns `true`. */
  readonly updateDictionary = BackgroundStreamFunction<boolean, string>(
    "DesktopBackend.updateDictionary",
    () => this.background!.updateDictionary(),
    "Updating dictionary...",
  );
}
