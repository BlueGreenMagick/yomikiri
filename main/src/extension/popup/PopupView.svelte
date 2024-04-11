<script lang="ts">
  import Utils from "~/utils";
  import { Toast } from "~/toast";
  import type { Backend, TokenizeResult } from "@platform/backend";
  import {
    AnkiNoteBuilder,
    LoadingNoteData,
    type MarkerData,
  } from "~/ankiNoteBuilder";
  import Tokenize from "~/components/dictionary/Tokenize.svelte";
  import type { SelectedEntryForAnki } from "~/components/dictionary/DicEntryView.svelte";
  import AddToAnki from "../content/AddToAnki.svelte";
  import ActionButtons from "./ActionButtons.svelte";
  import type { Platform } from "@platform";
  import type { Config } from "~/config";

  export let platform: Platform;
  export let config: Config;
  export let backend: Backend;

  let previewIsVisible = false;
  let previewNoteData: LoadingNoteData;

  function onShowAnkiPreview(
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
      note = AnkiNoteBuilder.buildNote({ platform, config }, markerData);
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
    <Tokenize {onShowAnkiPreview} {platform} {config} {backend}>
      <ActionButtons {platform} {config} />
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
