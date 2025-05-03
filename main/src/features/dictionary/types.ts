import type { WordEntry } from "@yomikiri/backend-bindings";
import type { SelectedMeaning } from "./dicEntriesModel";

export type Tools = "translate" | "grammar" | null;

export interface SelectedEntryForAnki {
  entry: WordEntry;
  selected?: SelectedMeaning | undefined;
}
