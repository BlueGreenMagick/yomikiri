<script lang="ts">
  import IconSettings from "@icons/settings.svg";
  import IconPower from "@icons/power.svg";
  import Utils from "~/utils";
  import Config from "~/config";
  import { Toast } from "~/toast";
  import { BrowserApi } from "../browserApi";
  import { Platform } from "@platform";
  import type { TokenizeResult } from "@platform/backend";
  import {
    AnkiNoteBuilder,
    LoadingNoteData,
    type MarkerData,
  } from "~/ankiNoteBuilder";
  import Tokenize from "~/components/dictionary/Tokenize.svelte";
  import type { SelectedEntryForAnki } from "~/components/dictionary/DicEntryView.svelte";
  import AddToAnki from "../content/AddToAnki.svelte";

  let previewIsVisible = false;
  let previewNoteData: LoadingNoteData;
  // TODO: Move this to Config store
  let stateEnabled = Config.get("state.enabled");

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

  function openSettings() {
    Platform.openOptionsPage();
  }

  function noteAdded() {
    previewIsVisible = false;
  }

  function toggleEnable() {
    let prevValue = Config.get("state.enabled");
    stateEnabled = !prevValue;
    Config.set("state.enabled", stateEnabled);
  }
</script>

<div class="popup">
  <div class="tokenize-container" class:previewIsVisible>
    <Tokenize {onShowAnkiPreview}>
      <div class="action-buttons">
        <button
          class="icon-action"
          class:active={stateEnabled}
          on:click={toggleEnable}
          title={stateEnabled ? "Disable" : "Enable"}
        >
          <IconPower />
        </button>
        <button
          class="icon-action"
          on:click={openSettings}
          title="Open Settings"
        >
          <IconSettings />
        </button>
      </div>
    </Tokenize>
  </div>
  {#if previewIsVisible}
    <AddToAnki noteData={previewNoteData} on:back={onBack} {noteAdded} />
  {/if}
</div>

<style>
  .popup {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
  }

  .tokenize-container.previewIsVisible {
    display: none;
  }

  .icon-action {
    width: 36px;
    height: 36px;
    background-color: var(--button-bg);
    fill: white;
    border-radius: 4px;
    padding: 4px;
    transition: background-color 0.25s;
  }

  :global(html.ios) .icon-action {
    width: 48px;
    height: 48px;
  }

  .icon-action.active {
    background-color: var(--accent-orange);
  }

  @media (hover: hover) {
    .icon-action:hover,
    .icon-action:focus {
      filter: brightness(0.9);
      cursor: pointer;
    }
  }

  .action-buttons {
    margin-top: 48px;
    width: 100%;

    display: flex;
    gap: 8px;
    flex-direction: row;
    justify-content: center;
  }

  :global(html.ios) .action-buttons {
    margin-top: 80px;
  }
</style>
