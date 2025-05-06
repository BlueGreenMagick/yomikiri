<script lang="ts">
  import type { TokenizeResult } from "@/platform/types/backend";
  import {
    type LoadingAnkiNote,
    type AnkiBuilderData,
    buildAnkiNote,
  } from "@/features/anki";
  import { Tokenize, type SelectedEntryForAnki } from "@/features/dictionary";
  import { AddToAnki } from "@/features/anki";
  import ActionButtons from "./ActionButtons.svelte";
  import DeferredNoteInfo from "./DeferredNoteInfo.svelte";
  import { Platform } from "#platform";
  import type { AppContext } from "@/features/context";

  export let ctx: AppContext;

  let previewIsVisible = false;
  let previewNoteData: LoadingAnkiNote;

  function onShowAnkiPreview(
    selectedEntry: SelectedEntryForAnki,
    tokenizeResult: TokenizeResult,
  ) {
    const markerData: AnkiBuilderData = {
      tokenized: tokenizeResult,
      entry: selectedEntry.entry,
      selected: selectedEntry.selected,
      sentence: tokenizeResult.tokens.map((tok) => tok.text).join(""),
      url: "",
      pageTitle: "",
    };
    let note = buildAnkiNote({ config: ctx.config }, markerData);
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
    <Tokenize {ctx} {onShowAnkiPreview}>
      <ActionButtons {ctx} />
      {#if Platform.type === "desktop"}
        <DeferredNoteInfo {ctx} />
      {/if}
    </Tokenize>
  </div>
  {#if previewIsVisible}
    <AddToAnki noteData={previewNoteData} {onBack} {noteAdded} />
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
