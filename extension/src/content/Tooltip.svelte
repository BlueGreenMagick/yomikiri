<script lang="ts">
  import DicEntriesView from "~/components/DicEntriesView.svelte";
  import {
    AnkiNoteBuilder,
    type LoadingNoteData,
    type MarkerData,
  } from "~/ankiNoteBuilder";
  import AddToAnki from "./AddToAnki.svelte";
  import { createEventDispatcher, tick } from "svelte";
  import Toolbar, { type Tools } from "~/components/Toolbar.svelte";
  import GrammarPane from "~/components/GrammarPane.svelte";
  import { TokenizeResult } from "~/backend";
  import type { SelectedEntryForAnki } from "~/components/DicEntryView.svelte";
  import { Toast } from "~/toast";
  import Utils from "~/utils";
  import TranslatePane from "~/components/TranslatePane.svelte";

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

  async function onSelectedToolChanged(_tool: Tools | null) {
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

  $: grammarDisabled = tokenizeResult.grammars.length == 0;
  $: sentence = tokenizeResult.tokens.map((t) => t.text).join("");
  $: onSelectedToolChanged(selectedTool);
  $: onTokenizeResultChanged(tokenizeResult);
</script>

<div>
  <div class="dic-entries-container">
    <Toolbar {grammarDisabled} bind:selected={selectedTool} />
    <div class="tools-pane" class:hidden={selectedTool === null}>
      <TranslatePane {sentence} shown={selectedTool === "translate"} />
      <GrammarPane
        grammars={tokenizeResult.grammars}
        shown={selectedTool === "grammar"}
      />
    </div>
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
  .tools-pane {
    border-bottom: 1px solid var(--border);
  }

  .tools-pane.hidden {
    display: none;
  }

  .add-to-anki-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
  }
</style>
