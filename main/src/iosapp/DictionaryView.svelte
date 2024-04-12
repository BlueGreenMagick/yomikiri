<script lang="ts">
  import type { SelectedEntryForAnki } from "~/components/dictionary/DicEntryView.svelte";
  import Tokenize from "../components/dictionary/Tokenize.svelte";
  import { type IosAppPlatform } from "~/platform/iosapp";
  import type { IosAppBackend, TokenizeResult } from "@platform/backend";
  import {
    AnkiNoteBuilder,
    type LoadingNoteData,
    type MarkerData,
  } from "~/ankiNoteBuilder";
  import Utils from "~/utils";
  import { Toast } from "~/toast";
  import AddToAnki from "~/extension/content/AddToAnki.svelte";
  import type Config from "~/config";
  import type { IosAppAnkiApi } from "~/platform/iosapp/anki";

  export let platform: IosAppPlatform;
  export let config: Config;
  export let backend: IosAppBackend;
  export let ankiApi: IosAppAnkiApi;
  export let context: "app" | "action";
  export let searchText: string;

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

<div class="dictionary-view">
  <div class="tokenize-container" class:previewIsVisible>
    <Tokenize
      {platform}
      {config}
      {backend}
      bind:searchText
      showCloseButton={context === "action"}
      {onShowAnkiPreview}
      on:close={async () => {
        await platform.messageWebview("close", null);
      }}
    >
      <div class="placeholder-container">
        <div class="placeholder">Type in Japanese text</div>
      </div>
    </Tokenize>
  </div>
  {#if previewIsVisible}
    <AddToAnki
      noteData={previewNoteData}
      on:back={onBack}
      {noteAdded}
      {ankiApi}
    />
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
