<script lang="ts">
  import DicEntriesView from "~/components/dictionary/DicEntriesView.svelte";
  import {
    AnkiNoteBuilder,
    type LoadingNoteData,
    type MarkerData,
  } from "~/ankiNoteBuilder";
  import AddToAnki from "./AddToAnki.svelte";
  import { createEventDispatcher, tick } from "svelte";
  import { type Tools } from "~/components/dictionary/Toolbar.svelte";
  import { TokenizeResult } from "~/backend";
  import type { SelectedEntryForAnki } from "~/components/dictionary/DicEntryView.svelte";
  import { Toast } from "~/toast";
  import Utils from "~/utils";
  import ToolbarWithPane from "~/components/dictionary/ToolbarWithPane.svelte";

  interface Events {
    updateHeight: void;
  }

  export let tokenizeResult: TokenizeResult;
  let previewIsVisible = false;
  let previewNoteData: LoadingNoteData;
  let selectedTool: Tools | null = null;

  const dispatch = createEventDispatcher<Events>();

  async function onBack() {
    previewIsVisible = false;
    await tick();
    dispatch("updateHeight");
  }

  async function onTokenizeResultChanged(tokenizeResult: TokenizeResult) {
    previewIsVisible = false;
    selectedTool = null;
    await tick();
    dispatch("updateHeight");
  }

  async function selectedEntryForAnki(ev: CustomEvent<SelectedEntryForAnki>) {
    const request = ev.detail;
    const markerData: MarkerData = {
      tokenized: tokenizeResult,
      entry: request.entry,
      selectedMeaning: request.sense,
      sentence: tokenizeResult.tokens.map((tok) => tok.text).join(""),
      url: window.location.href,
      pageTitle: document.title,
    };

    let note: LoadingNoteData;
    try {
      note = await AnkiNoteBuilder.buildNote(markerData);
    } catch (err) {
      Toast.error(Utils.errorMessage(err));
      throw err;
    }
    previewNoteData = note;
    previewIsVisible = true;
    await tick();
    dispatch("updateHeight");
  }

  async function changeSelectedTool(tool: Tools | null): Promise<void> {
    selectedTool = tool;
    await tick();
    dispatch("updateHeight");
  }

  $: sentence = tokenizeResult.tokens.map((t) => t.text).join("");
  $: onTokenizeResultChanged(tokenizeResult);
</script>

<div class="tooltip">
  <ToolbarWithPane
    grammars={tokenizeResult.grammars}
    {sentence}
    {selectedTool}
    {changeSelectedTool}
  />
  <div class="dic-entries-container">
    <DicEntriesView
      entries={tokenizeResult.entries}
      on:selectedEntryForAnki={selectedEntryForAnki}
    />
  </div>
  {#if previewIsVisible}
    <div class="add-to-anki-container">
      <AddToAnki noteData={previewNoteData} on:back={onBack} />
    </div>
  {/if}
</div>

<style>
  .tooltip {
    max-height: 300px;
    display: flex;
    flex-direction: column;
  }

  .dic-entries-container {
    flex: 1 1 auto;
    overflow-y: auto;
  }

  .add-to-anki-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
  }
</style>
