import { writable, type Writable } from "svelte/store";
import type { Entry, Sense } from "~/dicEntry";

export interface SelectedSense {
  entry: Entry;
  sense: Sense;
}

export class DicEntriesModel {
  selectedSense: Writable<SelectedSense | null> = writable(null);

  reset() {
    this.selectedSense.set(null);
  }

  selectSense(entry: Entry, sense: Sense) {
    this.selectedSense.set({ entry, sense });
  }

  unselectSense() {
    this.selectedSense.set(null);
  }
}
