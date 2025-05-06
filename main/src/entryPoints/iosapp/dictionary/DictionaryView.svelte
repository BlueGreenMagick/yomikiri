<script lang="ts">
  import { Tokenize, type SelectedEntryForAnki } from "@/features/dictionary";
  import type { TokenizeResult } from "@/platform/iosapp/backend";
  import {
    type LoadingAnkiNote,
    type AnkiBuilderData,
    buildAnkiNote,
    AddToAnki,
  } from "@/features/anki";
  import { Platform } from "@/platform/iosapp";
  import type { AppCtx } from "@/features/ctx";

  export let ctx: AppCtx;
  export let context: "app" | "action";
  export let searchText: string;

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

<div class="dictionary-view">
  <div class="tokenize-container" class:previewIsVisible>
    <Tokenize
      {ctx}
      bind:searchText
      showCloseButton={context === "action"}
      {onShowAnkiPreview}
      onClose={async () => {
        await Platform.messageWebview("close", null);
      }}
    >
      <div class="placeholder-container">
        <div class="placeholder">Type in Japanese text</div>
      </div>
    </Tokenize>
  </div>
  {#if previewIsVisible}
    <AddToAnki noteData={previewNoteData} {onBack} {noteAdded} />
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
    background-color: var(--background);
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
