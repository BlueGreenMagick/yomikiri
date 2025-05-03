<script lang="ts">
  import DicEntriesView from "@/components/dictionary/DicEntriesView.svelte";
  import {
    type LoadingAnkiNote,
    type AnkiBuilderData,
    buildAnkiNote,
    AddToAnki,
  } from "@/features/anki";
  import { tick } from "svelte";
  import { type Tools } from "@/components/dictionary/Toolbar.svelte";
  import type { TokenizeResult } from "#platform/backend";
  import type { SelectedEntryForAnki } from "@/components/dictionary/DicEntryView.svelte";
  import ToolbarWithPane from "@/components/dictionary/ToolbarWithPane.svelte";
  import { Config } from "@/features/config";
  import { Toast } from "@/features/toast";
  import { YomikiriError } from "@/features/error";

  export let tokenizeResult: TokenizeResult;
  export let onClose: () => void;
  export let onUpdateHeight: (height: number) => void = (_) => null;

  const config = Config.using();
  const maxHeightConfig = config.store("general.tooltip_max_height");

  let tooltipElem: HTMLDivElement;
  let previewIsVisible = false;
  let previewNoteData: LoadingAnkiNote;
  let selectedTool: Tools | null = null;

  async function onBack() {
    previewIsVisible = false;
    await tick();
    updateHeight();
  }

  async function onTokenizeResultChanged(_tokenizeResult: TokenizeResult) {
    previewIsVisible = false;
    selectedTool = null;
    await tick();
    updateHeight();
  }

  async function selectedEntryForAnki(request: SelectedEntryForAnki) {
    try {
      await _selectedEntryForAnki(request);
    } catch (err) {
      Toast.yomikiriError(YomikiriError.from(err));
    }
  }
  async function _selectedEntryForAnki(request: SelectedEntryForAnki) {
    const markerData: AnkiBuilderData = {
      tokenized: tokenizeResult,
      entry: request.entry,
      selected: request.selected,
      sentence: tokenizeResult.tokens.map((tok) => tok.text).join(""),
      url: window.location.href,
      pageTitle: document.title,
    };

    const note = buildAnkiNote({ config }, markerData);
    previewNoteData = note;
    previewIsVisible = true;
    await tick();
    updateHeight();
  }

  async function changeSelectedTool(tool: Tools | null): Promise<void> {
    selectedTool = tool;
    await tick();
    updateHeight();
  }

  function noteAdded() {
    onClose();
    previewIsVisible = false;
  }

  function updateHeight() {
    const rect = tooltipElem.getBoundingClientRect();
    onUpdateHeight(rect.height);
  }

  $: sentence = tokenizeResult.tokens.map((t) => t.text).join("");
  $: void onTokenizeResultChanged(tokenizeResult);
</script>

<div
  bind:this={tooltipElem}
  class="tooltip"
  style:--max-height={`${$maxHeightConfig}px`}
>
  <div class="dictionary-view" class:previewIsVisible>
    <div class="header">
      <ToolbarWithPane
        {onClose}
        grammars={tokenizeResult.grammars}
        {sentence}
        {selectedTool}
        tooltipMode={true}
        {changeSelectedTool}
      />
    </div>
    <div class="scrollable">
      <DicEntriesView
        entries={tokenizeResult.entries}
        onSelectEntryForAnki={selectedEntryForAnki}
      />
    </div>
  </div>
  {#if previewIsVisible}
    <div class="anki-preview">
      <AddToAnki noteData={previewNoteData} {onBack} {noteAdded} />
    </div>
  {/if}
</div>

<style>
  .tooltip {
    max-height: var(--max-height);
  }

  .dictionary-view {
    max-height: inherit;
    display: flex;
    flex-direction: column;
  }

  .dictionary-view.previewIsVisible {
    display: none;
  }

  .header {
    flex: 0 0 auto;
  }

  .scrollable {
    flex: 1 1 auto;
    min-width: 0;
    overflow-y: auto;
  }

  .anki-preview {
    max-height: inherit;
  }
</style>
