<script lang="ts">
  import DicEntriesView from "components/dictionary/DicEntriesView.svelte";
  import {
    type LoadingAnkiNote,
    type AnkiBuilderData,
    buildAnkiNote,
  } from "lib/anki";
  import AddToAnki from "../../components/anki/AddToAnki.svelte";
  import { tick } from "svelte";
  import { type Tools } from "components/dictionary/Toolbar.svelte";
  import { TokenizeResult } from "@platform/backend";
  import type { SelectedEntryForAnki } from "components/dictionary/DicEntryView.svelte";
  import { Toast } from "lib/toast";
  import Utils from "lib/utils";
  import ToolbarWithPane from "components/dictionary/ToolbarWithPane.svelte";
  import type { Config } from "lib/config";
  import type { AnkiApi } from "@platform/anki";

  export let config: Config;
  export let ankiApi: AnkiApi;
  export let tokenizeResult: TokenizeResult;
  export let onClose: () => void;
  export let onUpdateHeight: () => void = () => null;

  let previewIsVisible = false;
  let previewNoteData: LoadingAnkiNote;
  let selectedTool: Tools | null = null;

  async function onBack() {
    previewIsVisible = false;
    await tick();
    onUpdateHeight();
  }

  async function onTokenizeResultChanged(_tokenizeResult: TokenizeResult) {
    previewIsVisible = false;
    selectedTool = null;
    await tick();
    onUpdateHeight();
  }

  async function selectedEntryForAnki(request: SelectedEntryForAnki) {
    const markerData: AnkiBuilderData = {
      tokenized: tokenizeResult,
      entry: request.entry,
      selectedMeaning: request.sense,
      sentence: tokenizeResult.tokens.map((tok) => tok.text).join(""),
      url: window.location.href,
      pageTitle: document.title,
    };

    let note: LoadingAnkiNote;
    try {
      note = buildAnkiNote({ config }, markerData);
    } catch (err) {
      Toast.error(Utils.getErrorMessage(err));
      throw err;
    }
    previewNoteData = note;
    previewIsVisible = true;
    await tick();
    onUpdateHeight();
  }

  async function changeSelectedTool(tool: Tools | null): Promise<void> {
    selectedTool = tool;
    await tick();
    onUpdateHeight();
  }

  function noteAdded() {
    onClose();
    previewIsVisible = false;
  }

  $: sentence = tokenizeResult.tokens.map((t) => t.text).join("");
  $: void onTokenizeResultChanged(tokenizeResult);
</script>

<div class="tooltip">
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
        {config}
        entries={tokenizeResult.entries}
        onSelectEntryForAnki={selectedEntryForAnki}
      />
    </div>
  </div>
  {#if previewIsVisible}
    <div class="anki-preview">
      <AddToAnki noteData={previewNoteData} {onBack} {ankiApi} {noteAdded} />
    </div>
  {/if}
</div>

<style>
  .tooltip {
    max-height: 300px;
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
    overflow-y: auto;
  }

  .anki-preview {
    max-height: inherit;
  }
</style>
