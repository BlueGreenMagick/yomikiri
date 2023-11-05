<script lang="ts">
  import type { Entry } from "~/dicEntry";
  import DicEntriesView from "~/components/DicEntriesView.svelte";
  import { platformClass } from "~/components/actions";
  import type { NoteData } from "~/ankiNoteBuilder";
  import DicEntryView from "~/components/DicEntryView.svelte";
  import AddToAnki from "./AddToAnki.svelte";

  let view: "entries" | "preview" = "entries";
  let entries: Entry[] = [];
  let previewEntry: Entry;
  let previewNoteData: NoteData;

  export function showEntries(e: Entry[]) {
    view = "entries";
    entries = e;
  }

  export function showPreview(entry: Entry, noteData: NoteData) {
    view = "preview";
    previewEntry = entry;
    previewNoteData = noteData;
  }

  function onBack() {
    view = "entries";
  }
</script>

<div use:platformClass>
  {#if view == "entries"}
    <div class="dic-entries-container">
      <DicEntriesView {entries} on:addNote />
    </div>
  {:else}
    <div class="preview-container">
      <AddToAnki noteData={previewNoteData} on:back={onBack} on:add />
    </div>
  {/if}
</div>

<style global>
  @import "../global.css";
</style>
