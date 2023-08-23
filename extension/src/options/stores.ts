import { writable } from "svelte/store";

export const updated = writable(false);

export function updateConfig() {
  updated.update((c) => !c);
}
