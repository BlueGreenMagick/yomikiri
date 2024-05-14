<script lang="ts">
  import DicEntriesView from "~/components/dictionary/DicEntriesView.svelte";
  import {
    AnkiNoteBuilder,
    type LoadingNoteData,
    type MarkerData,
  } from "~/lib/ankiNoteBuilder";
  import AddToAnki from "../../components/anki/AddToAnki.svelte";
  import { tick } from "svelte";
  import { type Tools } from "~/components/dictionary/Toolbar.svelte";
  import { TokenizeResult } from "@platform/backend";
  import type { SelectedEntryForAnki } from "~/components/dictionary/DicEntryView.svelte";
  import { Toast } from "~/lib/toast";
  import Utils from "~/lib/utils";
  import ToolbarWithPane from "~/components/dictionary/ToolbarWithPane.svelte";
  import type { Platform } from "@platform";
  import type { Config } from "~/lib/config";
  import type { AnkiApi } from "@platform/anki";

  export let platform: Platform;
  export let config: Config;
  export let ankiApi: AnkiApi;
  export let tokenizeResult: TokenizeResult;
  export let onClose: () => void;
  export let onUpdateHeight: () => void = () => null;

  let previewIsVisible = false;
  let previewNoteData: LoadingNoteData;
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
    const markerData: MarkerData = {
      tokenized: tokenizeResult,
      entry: request.entry,
      selectedMeaning: request.sense,
      sentence: tokenizeResult.tokens.map((tok) => tok.text).join(""),
      url: window.location.href,
      pageTitle: document.title,
    };

    let note: LoadingNoteData;
    try {
      note = AnkiNoteBuilder.buildNote({ platform, config }, markerData);
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
  <div class="dic-entries-container" class:previewIsVisible>
    <ToolbarWithPane
      {platform}
      {onClose}
      grammars={tokenizeResult.grammars}
      {sentence}
      {selectedTool}
      tooltipMode={true}
      {changeSelectedTool}
    />
    <DicEntriesView
      {platform}
      {config}
      entries={tokenizeResult.entries}
      onSelectEntryForAnki={selectedEntryForAnki}
    />
  </div>
  {#if previewIsVisible}
    <div class="add-to-anki-container">
      <AddToAnki noteData={previewNoteData} {onBack} {ankiApi} {noteAdded} />
    </div>
  {/if}
</div>

<style>
  .tooltip {
    max-height: 300px;
  }

  .dic-entries-container {
    overflow-y: auto;
  }

  .dic-entries-container.previewIsVisible {
    display: none;
  }

  .add-to-anki-container {
    width: 100%;
    max-height: 300px;
  }
</style>
