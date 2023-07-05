import { Api } from "~/api";
import type { IAnkiAddNotes } from "../types/anki";
import type { NoteData } from "~/ankiNoteBuilder";
import Config from "~/config";
import Utils from "~/utils";

export namespace AnkiApi {
  /**
   * This function must not be called in content script context.
   * Does not wait for note to actually be added to Anki.
   */
  export async function addNote(note: NoteData): Promise<void> {
    const currentTab = await Api.currentTab();
    if (currentTab.id === undefined) {
      throw new Error("Current tab does not have an id");
    }
    await Api.setStorage("x-callback.tabId", currentTab.id);

    const fields: Record<string, string> = {};
    for (const field of note.fields) {
      const queryKey = "fld" + field.name;
      fields[queryKey] = field.value;
    }
    const params = {
      type: note.notetype,
      deck: note.deck,
      tags: note.tags,
      // allow duplicate
      dupes: "1",
      ...fields,
      "x-success": "http://yomikiri-redirect.bluegreenmagick.com",
    };
    const ankiLink = "anki://x-callback-url/addnote?" + Utils.urlParams(params);
    Api.updateTab(currentTab.id, { url: ankiLink });
  }
}

AnkiApi satisfies IAnkiAddNotes;
