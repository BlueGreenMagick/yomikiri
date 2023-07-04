import { writable } from "svelte/store";

export const updated = writable(false);
export const ankiTemplateModalHidden = writable(true);

export function updateConfig() {
  updated.update((c) => !c);
}
