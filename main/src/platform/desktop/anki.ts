import type { AnkiInfo, AnkiNote } from "@/features/anki";
import { Config } from "@/features/config";
import { getStorage, removeStorage, setStorage } from "@/features/extension";
import { LazyAsync } from "@/features/utils";
import type { AnkiAddNoteReq, IAnkiAddNotes, IAnkiOptions } from "../types/anki";
import { sendDesktopExtensionMessage } from "./message";
import type { DesktopAnkiApiPage } from "./page/anki";

/** Must be initialized synchronously on page load */
export class DesktopAnkiApi implements IAnkiOptions, IAnkiAddNotes {
  readonly type = "desktop";

  private constructor(
    private readonly lazyConfig: LazyAsync<Config>,
    private page?: DesktopAnkiApiPage,
  ) {}

  static content(lazyConfig: LazyAsync<Config>) {
    return new DesktopAnkiApi(lazyConfig);
  }

  static page(lazyConfig: LazyAsync<Config>, page: DesktopAnkiApiPage) {
    return new DesktopAnkiApi(lazyConfig, page);
  }

  getAnkiInfo(): Promise<AnkiInfo> {
    if (this.page) {
      return this.page.getAnkiInfo();
    } else {
      return sendDesktopExtensionMessage("DesktopAnkiApi.ankiInfo", undefined);
    }
  }

  requestAnkiInfo(): Promise<void> {
    if (this.page) {
      return this.page.checkConnection();
    } else {
      return sendDesktopExtensionMessage("DesktopAnkiApi.requestAnkiInfo", undefined);
    }
  }

  checkConnection(): Promise<void> {
    if (this.page) {
      return this.page.checkConnection();
    } else {
      return sendDesktopExtensionMessage("DesktopAnkiApi.checkConnection", undefined);
    }
  }

  addNote(req: AnkiAddNoteReq): Promise<boolean> {
    if (this.page) {
      return this.page.addNote(req);
    } else {
      return sendDesktopExtensionMessage("DesktopAnkiApi.addNote", req);
    }
  }

  /**
   * If there are deferred notes, add to Anki.
   *
   * If failed to add a note, save the error message to config
   * and continue to next note.
   *
   * Resets stored error messages.
   *
   * Returns null if deferred notes are currently being added, and another request is queued.
   */
  addDeferredNotes(): Promise<void | null> {
    if (this.page) {
      return this.page.addDeferredNotes();
    } else {
      return sendDesktopExtensionMessage("DesktopAnkiApi.addDeferredNotes", undefined);
    }
  }

  /**
   * Deletes all deferred notes and error messages from storage.
   * Returns a job object that you can undo.
   */
  async clearDeferredNotes(): Promise<ClearDeferredNotesJob> {
    const config = await this.lazyConfig.get();
    return ClearDeferredNotesJob.run(config);
  }

  async getDeferredNotesErrorMessages(): Promise<string[]> {
    return await getStorage("deferred-anki-note-errors", []);
  }
}

/**
 * This job clears saved deferred notes. It can be undone by calling `.undo()`.
 */
export class ClearDeferredNotesJob {
  notes: AnkiNote[];
  errors: string[];
  config: Config;

  private constructor(config: Config, notes: AnkiNote[], errors: string[]) {
    this.config = config;
    this.notes = notes;
    this.errors = errors;
  }

  static async run(config: Config): Promise<ClearDeferredNotesJob> {
    const notes = (await getStorage("deferred-anki-note")) ?? [];
    const errors = (await getStorage("deferred-anki-note-errors")) ?? [];

    await config.setBatch({
      "state.anki.deferred_note_count": 0,
      "state.anki.deferred_note_error": false,
    });
    await removeStorage("deferred-anki-note-errors");
    await removeStorage("deferred-anki-note");
    return new ClearDeferredNotesJob(config, notes, errors);
  }

  async undo() {
    await setStorage("deferred-anki-note", this.notes);
    await setStorage("deferred-anki-note-errors", this.errors);
    await this.config.setBatch({
      "state.anki.deferred_note_count": this.notes.length,
      "state.anki.deferred_note_error": this.errors.length > 0,
    });
  }
}
