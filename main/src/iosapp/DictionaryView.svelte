<script lang="ts">
  import type { SelectedEntryForAnki } from "~/components/dictionary/DicEntryView.svelte";
  import Tokenize from "../components/dictionary/Tokenize.svelte";
  import { Platform } from "~/platform/iosapp";
  import type { TokenizeResult } from "@platform/backend";
  import {
    AnkiNoteBuilder,
    type LoadingNoteData,
    type MarkerData,
  } from "~/ankiNoteBuilder";
  import Utils from "~/utils";
  import { Toast } from "~/toast";
  import AddToAnki from "~/extension/content/AddToAnki.svelte";

  export let context: "app" | "action";
  export let searchText: string;

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

<div class="dictionary-view">
  <div class="tokenize-container" class:previewIsVisible>
    <Tokenize
      bind:searchText
      showCloseButton={context === "action"}
      {onShowAnkiPreview}
      on:close={() => {
        Platform.messageWebview("close", null);
      }}
    >
      <div class="placeholder-container">
        <div class="placeholder">Type in Japanese text</div>
      </div>
    </Tokenize>
  </div>
  {#if previewIsVisible}
    <AddToAnki noteData={previewNoteData} on:back={onBack} {noteAdded} />
  {/if}
</div>

<style>
  .dictionary-view {
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

  .placeholder-container {
    flex: 1 1 auto;
    display: flex;
    align-items: center;
  }

  .placeholder {
    flex: 1 1 auto;
    margin: 36px;
    font-size: 18px;
    text-align: center;
    color: var(--text-light);
  }
</style>
