<script lang="ts">
  import type { Entry } from "~/dicEntry";
  import DicEntriesView from "~/components/DicEntriesView.svelte";
  import { platformClass } from "~/components/actions";
  import type { LoadingNoteData, NoteData } from "~/ankiNoteBuilder";
  import DicEntryView from "~/components/DicEntryView.svelte";
  import AddToAnki from "./AddToAnki.svelte";
  import { createEventDispatcher } from "svelte";

  interface Events {
    updateHeight: void;
  }

  const dispatch = createEventDispatcher<Events>();

  let previewIsVisible = false;
  let entries: Entry[] = [];
  let previewNoteData: LoadingNoteData;

  export function showEntries(e: Entry[]) {
    previewIsVisible = false;
    entries = e;
  }

  export function showPreview(entry: Entry, noteData: LoadingNoteData) {
    previewIsVisible = true;
    previewNoteData = noteData;
  }

  function onBack() {
    previewIsVisible = false;
    dispatch("updateHeight");
  }
</script>

<div id="main" use:platformClass>
  <div class="dic-entries-container">
    <DicEntriesView {entries} on:selectedEntryForAnki />
  </div>
  {#if previewIsVisible}
    <div class="add-to-anki-container">
      <AddToAnki noteData={previewNoteData} on:back={onBack} on:addNote />
    </div>
  {/if}
</div>

<style global>
  @import "../global.css";

  #main {
    max-height: 300px;
    overflow-y: auto;
  }

  #main > .add-to-anki-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
  }
</style>
