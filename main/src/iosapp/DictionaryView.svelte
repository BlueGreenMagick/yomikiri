<script lang="ts">
  import type { SelectedEntryForAnki } from "components/dictionary/DicEntryView.svelte";
  import Tokenize from "components/dictionary/Tokenize.svelte";
  import AddToAnki from "components/anki/AddToAnki.svelte";
  import type { IosAppAnkiApi } from "platform/iosapp/anki";
  import type { IosAppBackend, TokenizeResult } from "platform/iosapp/backend";
  import {
    type LoadingAnkiNote,
    type AnkiBuilderData,
    buildAnkiNote,
  } from "lib/anki";
  import { Toast } from "lib/toast";
  import type Config from "lib/config";
  import { Platform } from "platform/iosapp";
  import { YomikiriError } from "lib/error";

  export let config: Config;
  export let backend: IosAppBackend;
  export let ankiApi: IosAppAnkiApi;
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
      selectedMeaning: selectedEntry.sense,
      sentence: tokenizeResult.tokens.map((tok) => tok.text).join(""),
      url: "",
      pageTitle: "",
    };

    let note: LoadingAnkiNote;
    try {
      note = buildAnkiNote({ config }, markerData);
    } catch (err) {
      const error = YomikiriError.from(err);
      Toast.error(error.message, error.details.join("\n"));
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
      {config}
      {backend}
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
    <AddToAnki noteData={previewNoteData} {onBack} {noteAdded} {ankiApi} />
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
