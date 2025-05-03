import type { AnkiNote } from "@/features/anki";
import { generateUrlParams } from "@/lib/utils";

export function iosAnkiMobileURL(note: AnkiNote, successUrl?: string): string {
  const fields: Record<string, string> = {};
  for (const field of note.fields) {
    const queryKey = "fld" + field.name;
    fields[queryKey] = field.value;
  }
  const params: Record<string, string> = {
    type: note.notetype,
    deck: note.deck,
    tags: note.tags,
    // allow duplicate
    dupes: "1",
    ...fields,
  };
  if (typeof successUrl === "string") {
    params["x-success"] = successUrl;
  }
  const url = "anki://x-callback-url/addnote?" + generateUrlParams(params);
  return url;
}
