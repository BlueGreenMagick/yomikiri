<script lang="ts">
  import Utils from "~/utils";
  import { Toast } from "~/toast";
  import type { TokenizeResult } from "@platform/backend";
  import {
    AnkiNoteBuilder,
    LoadingNoteData,
    type MarkerData,
  } from "~/ankiNoteBuilder";
  import Tokenize from "~/components/dictionary/Tokenize.svelte";
  import type { SelectedEntryForAnki } from "~/components/dictionary/DicEntryView.svelte";
  import AddToAnki from "../content/AddToAnki.svelte";
  import ActionButtons from "./ActionButtons.svelte";

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
    <Tokenize {onShowAnkiPreview}>
      <ActionButtons />
    </Tokenize>
  </div>
  {#if previewIsVisible}
    <AddToAnki noteData={previewNoteData} on:back={onBack} {noteAdded} />
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
