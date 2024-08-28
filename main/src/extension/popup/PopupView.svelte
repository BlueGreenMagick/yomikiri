<script lang="ts">
  import type { TokenizeResult } from "@platform/backend";
  import {
    type LoadingAnkiNote,
    type AnkiBuilderData,
    buildAnkiNote,
  } from "lib/anki";
  import Tokenize from "components/dictionary/Tokenize.svelte";
  import type { SelectedEntryForAnki } from "components/dictionary/DicEntryView.svelte";
  import AddToAnki from "../../components/anki/AddToAnki.svelte";
  import ActionButtons from "./ActionButtons.svelte";
  import type { Config } from "lib/config";
  import type { AnkiApi } from "@platform/anki";
  import DeferredNoteInfo from "./DeferredNoteInfo.svelte";

  export let config: Config;
  export let ankiApi: AnkiApi;

  let previewIsVisible = false;
  let previewNoteData: LoadingAnkiNote;

  function onShowAnkiPreview(
    selectedEntry: SelectedEntryForAnki,
    tokenizeResult: TokenizeResult,
  ) {
    const markerData: AnkiBuilderData = {
      tokenized: tokenizeResult,
      entry: selectedEntry.entry,
      selectedMeaning: selectedEntry.sense,
      sentence: tokenizeResult.tokens.map((tok) => tok.text).join(""),
      url: "",
      pageTitle: "",
    };
    let note = buildAnkiNote({ config }, markerData);
    previewNoteData = note;
    previewIsVisible = true;
  }

  function onBack() {
    previewIsVisible = false;
  }

  function noteAdded() {
    previewIsVisible = false;
  }
</script>

<div class="popup">
  <div class="tokenize-container" class:previewIsVisible>
    <Tokenize {onShowAnkiPreview} {config}>
      <ActionButtons {config} />
      <DeferredNoteInfo {config} {ankiApi} />
    </Tokenize>
  </div>
  {#if previewIsVisible}
    <AddToAnki noteData={previewNoteData} {onBack} {ankiApi} {noteAdded} />
  {/if}
</div>

<style>
  .popup {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .tokenize-container {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .tokenize-container.previewIsVisible {
    display: none;
  }
</style>
