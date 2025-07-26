import { BackgroundFunction, BackgroundStreamFunction } from "@/features/extension";
import type { IBackend, SearchRequest, TokenizeRequest } from "../types/backend";
import type { DesktopBackendBackground } from "./background/backend";

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

  readonly tokenize = BackgroundFunction(
    "DesktopBackend.tokenize",
    (req: TokenizeRequest) => this.background!.tokenize(req),
  );

  readonly search = BackgroundFunction(
    "DesktopBackend.searchTerm",
    (req: SearchRequest) => this.background!.search(req),
  );

  readonly getDictMetadata = BackgroundFunction(
    "DesktopBackend.getDictMetadata",
    () => this.background!.getDictMetadata(),
  );

  /** Returns `false` if already up-to-date. Otherwise, returns `true`. */
  readonly updateDictionary = BackgroundStreamFunction<boolean, string>(
    "DesktopBackend.updateDictionary",
    () => this.background!.updateDictionary(),
    "Updating dictionary...",
  );
}
