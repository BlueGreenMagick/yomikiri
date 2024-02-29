<script lang="ts">
  import type { Entry } from "~/dicEntry";
  import DicEntriesView from "~/components/DicEntriesView.svelte";
  import type { LoadingNoteData } from "~/ankiNoteBuilder";
  import AddToAnki from "./AddToAnki.svelte";
  import { createEventDispatcher, tick } from "svelte";
  import Toolbar, { type Tools } from "~/components/Toolbar.svelte";
  import GrammarPane from "~/components/GrammarPane.svelte";
  import type { GrammarInfo } from "@yomikiri/yomikiri-rs";

  interface Events {
    updateHeight: void;
  }

  export let previewIsVisible = false;
  export let entries: Entry[] = [];
  export let grammars: GrammarInfo[] = [];
  export let previewNoteData: LoadingNoteData;
  export let selectedTool: Tools | null = null;

  const dispatch = createEventDispatcher<Events>();

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

<div>
  <div class="dic-entries-container">
    <Toolbar {grammarDisabled} bind:selected={selectedTool} />
    <div class="tools-pane">
      {#if selectedTool === "grammar"}
        <GrammarPane {grammars} />
      {/if}
    </div>
    <DicEntriesView {entries} on:selectedEntryForAnki />
  </div>
  {#if previewIsVisible}
    <div class="add-to-anki-container">
      <AddToAnki noteData={previewNoteData} on:back={onBack} on:addNote />
    </div>
  {/if}
</div>

<style>
  .tools-pane {
    border-bottom: 1px solid var(--border);
  }

  .add-to-anki-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
  }
</style>
