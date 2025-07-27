import { type AnkiAddNoteReq, type IAnkiAddNotes } from "../types/anki";
import { sendIosExtensionMessage } from "./extensionMessage";
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
  addNote(req: AnkiAddNoteReq): Promise<boolean> {
    if (this.page) {
      return this.page.addNote(req);
    } else {
      return sendIosExtensionMessage("IosAnkiApi.addNote", req);
    }
  }
}
