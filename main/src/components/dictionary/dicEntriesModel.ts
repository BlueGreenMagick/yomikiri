import { writable, type Writable } from "svelte/store";
import type { Entry, Sense } from "lib/dicEntry";
import type { PartOfSpeech } from "@yomikiri/yomikiri-rs";

export interface SelectedMeaning {
  entry: Entry;
  sense: Sense;
  partOfSpeech: PartOfSpeech[];
}

export class DicEntriesModel {
  selectedMeaning: Writable<SelectedMeaning | null> = writable(null);

  reset() {
    this.selectedMeaning.set(null);
  }

  selectSense(entry: Entry, sense: Sense, partOfSpeech: PartOfSpeech[]) {
    this.selectedMeaning.set({ entry, sense, partOfSpeech });
  }

  unselectSense() {
    this.selectedMeaning.set(null);
  }
}
