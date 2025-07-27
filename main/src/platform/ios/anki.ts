import { NonContentScriptFunction } from "@/features/extension";
import { type IAnkiAddNotes } from "../types/anki";
import type { IosAnkiApiPage } from "./page/anki";

/** Must be initialized synchronously on page load */
export class IosAnkiApi implements IAnkiAddNotes {
  readonly type = "ios";

  private constructor(private page: IosAnkiApiPage | null) {}

  static background(platformPage: IosAnkiApiPage) {
    return new IosAnkiApi(platformPage);
  }

  static page(platformPage: IosAnkiApiPage) {
    return new IosAnkiApi(platformPage);
  }

  static content() {
    return new IosAnkiApi(null);
  }

  /**
   * Does not wait for note to actually be added to Anki.
   */
  readonly addNote = NonContentScriptFunction(
    "IosAnkiApi.addAnkiNote",
    this.page!.addNote.bind(this),
  );
}
