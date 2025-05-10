<script lang="ts">
  import { type AnkiBuilderData, buildAnkiNote, type LoadingAnkiNote } from "@/features/anki";
  import { AddToAnki } from "@/features/anki";
  import type { AppCtx, DesktopCtx } from "@/features/ctx";
  import { type SelectedEntryForAnki, Tokenize } from "@/features/dictionary";
  import { ActionButtons } from "@/features/popup";
  import type { TokenizeResult } from "@/platform/types/backend";
  import DeferredNoteInfo from "./DeferredNoteInfo.svelte";

  export let ctx: AppCtx<DesktopCtx>;

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
    let note = buildAnkiNote(ctx, markerData);
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
      <DeferredNoteInfo {ctx} />
    </Tokenize>
  </div>
  {#if previewIsVisible}
    <AddToAnki {ctx} noteData={previewNoteData} {onBack} {noteAdded} />
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
