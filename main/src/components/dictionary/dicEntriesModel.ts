import { writable, type Writable } from "svelte/store";
import type { Sense } from "lib/dicEntry";
import type { PartOfSpeech, WordEntry } from "#platform/backend";

export interface SelectedMeaning {
  entry: WordEntry;
  sense: Sense;
  partOfSpeech: PartOfSpeech[];
}

export class DicEntriesModel {
  selectedMeaning: Writable<SelectedMeaning | null> = writable(null);

  reset() {
    this.selectedMeaning.set(null);
  }

  selectSense(entry: WordEntry, sense: Sense, partOfSpeech: PartOfSpeech[]) {
    this.selectedMeaning.set({ entry, sense, partOfSpeech });
  }

  unselectSense() {
    this.selectedMeaning.set(null);
  }
}
