<script lang="ts">
  import type { Entry } from "~/dicEntry";
  import DicEntriesView from "~/components/DicEntriesView.svelte";
  import { platformClass } from "~/components/actions";
  import type { LoadingNoteData, NoteData } from "~/ankiNoteBuilder";
  import DicEntryView from "~/components/DicEntryView.svelte";
  import AddToAnki from "./AddToAnki.svelte";
  import { createEventDispatcher, tick } from "svelte";
  import Toolbar, { type Tools } from "~/components/Toolbar.svelte";
  import GrammarPane from "~/components/GrammarPane.svelte";
  import type { TokenizeResult } from "~/backend";
  import type { GrammarInfo } from "@yomikiri/yomikiri-rs";

  interface Events {
    updateHeight: void;
  }

  const dispatch = createEventDispatcher<Events>();

  let previewIsVisible = false;
  let entries: Entry[] = [];
  let grammars: GrammarInfo[] = [];
  let previewNoteData: LoadingNoteData;
  let selectedTool: Tools | null = null;

  export function showEntries(e: Entry[], g: GrammarInfo[]) {
    previewIsVisible = false;
    entries = e;
    grammars = g;
    selectedTool = null;
  }

  export function showPreview(entry: Entry, noteData: LoadingNoteData) {
    previewIsVisible = true;
    previewNoteData = noteData;
  }

  function onBack() {
    previewIsVisible = false;
    dispatch("updateHeight");
  }

  async function onSelectedToolChanged(_tool: Tools | null) {
    await tick();
    dispatch("updateHeight");
  }

  $: grammarDisabled = grammars.length == 0;
  $: onSelectedToolChanged(selectedTool);
</script>

<div id="main" use:platformClass>
  <div class="dic-entries-container">
    <Toolbar {grammarDisabled} bind:selected={selectedTool} />
    {#if selectedTool === "grammar"}
      <GrammarPane {grammars} />
    {/if}
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
