<script lang="ts">
  import Tokenize from "~/components/dictionary/Tokenize.svelte";
  import type { SelectedEntryForAnki } from "~/components/dictionary/DicEntryView.svelte";
  import { Toast } from "~/toast";
  import {
    AnkiNoteBuilder,
    LoadingNoteData,
    type MarkerData,
  } from "~/ankiNoteBuilder";
  import Utils from "~/utils";
  import type { TokenizeResult } from "~/backend";
  import AddToAnki from "../content/AddToAnki.svelte";

  let previewIsVisible = false;
  let previewNoteData: LoadingNoteData;

  async function onShowAnkiPreview(
    selectedEntry: SelectedEntryForAnki,
    tokenizeResult: TokenizeResult
  ) {
    const markerData: MarkerData = {
      tokenized: tokenizeResult,
      entry: selectedEntry.entry,
      selectedMeaning: selectedEntry.sense,
      sentence: tokenizeResult.tokens.map((tok) => tok.text).join(""),
      url: "",
      pageTitle: "",
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
    <Tokenize actionButtons={true} {onShowAnkiPreview} />
  </div>
  {#if previewIsVisible}
    <AddToAnki noteData={previewNoteData} on:back={onBack} {noteAdded} />
  {/if}
</div>

<style>
  .popup {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
  }

  .tokenize-container.previewIsVisible {
    display: none;
  }
</style>