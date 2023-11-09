<script lang="ts">
  import { fly } from "svelte/transition";
  import type { Entry } from "~/dicEntry";
  import DicEntriesView from "~/components/DicEntriesView.svelte";
  import { platformClass } from "~/components/actions";
  import type { NoteData } from "~/ankiNoteBuilder";
  import DicEntryView from "~/components/DicEntryView.svelte";
  import AddToAnki from "./AddToAnki.svelte";

  let previewIsVisible = false;
  let entries: Entry[] = [];
  let previewEntry: Entry;
  let previewNoteData: NoteData;

  export function showEntries(e: Entry[]) {
    previewIsVisible = false;
    entries = e;
  }

  export function showPreview(entry: Entry, noteData: NoteData) {
    previewIsVisible = true;
    previewEntry = entry;
    previewNoteData = noteData;
  }

  function onBack() {
    previewIsVisible = false;
  }
</script>

<div id="main" use:platformClass>
  <div class="dic-entries-container">
    <DicEntriesView {entries} on:addNote />
  </div>
  {#if previewIsVisible}
    <div
      transition:fly={{ x: "100%", duration: 500 }}
      class="add-to-anki-container"
    >
      <AddToAnki noteData={previewNoteData} on:back={onBack} on:add />
    </div>
  {/if}
</div>

<style global>
  @import "../global.css";

  #main > .add-to-anki-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
  }
</style>
