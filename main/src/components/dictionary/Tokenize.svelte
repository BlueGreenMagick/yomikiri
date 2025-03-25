<script lang="ts">
  import { type TokenizeResult, Backend } from "#platform/backend";
  import Utils from "@/lib/utils";
  import IconSearch from "#icons/search.svg";
  import IconCloseCircle from "#icons/close-circle.svg";
  import SentenceView from "./SentenceView.svelte";
  import DicEntriesView from "./DicEntriesView.svelte";
  import TextButton from "../TextButton.svelte";
  import ToolbarWithPane from "./ToolbarWithPane.svelte";
  import type { Tools } from "./Toolbar.svelte";
  import type { SelectedEntryForAnki } from "./DicEntryView.svelte";
  import { emptyTokenizeResult } from "@/platform/shared/backend";

  export let searchText = "";
  export let showCloseButton = false;
  export let onShowAnkiPreview: (
    selectedEntry: SelectedEntryForAnki,
    tokenizeResult: TokenizeResult,
  ) => void;
  export let onClose: () => void = () => null;

  let tokenizeResult: TokenizeResult = emptyTokenizeResult();
  // may be bigger than total token characters
  let selectedCharAt = 0;
  let selectedTool: Tools | null = null;

  /** modifies `searchTokens` */
  const search = Utils.SingleQueued(_search);
  async function _search(searchText: string, charAt: number) {
    charAt = Math.min(charAt, searchText.length - 1);
    tokenizeResult = await Backend.search({ term: searchText, charAt });
  }

  function changeSelectedTool(tool: Tools | null) {
    selectedTool = tool;
  }

  $: void search(searchText, selectedCharAt);
</script>

<div class="search">
  <div class="header" class:action-button-mode={searchText === ""}>
    <div class="searchbar">
      <div class="icon icon-search"><IconSearch /></div>
      <input
        type="text"
        bind:value={searchText}
        placeholder="Enter Japanese word or sentence."
      />
      <button
        class="icon icon-clear"
        class:hidden={searchText === ""}
        on:click={() => {
          searchText = "";
        }}
      >
        <IconCloseCircle />
      </button>
    </div>
    {#if showCloseButton}
      <div class="close-button">
        <TextButton label="Close" onClick={onClose} />
      </div>
    {/if}
  </div>
  {#if searchText !== ""}
    <div class="tokensview">
      <SentenceView tokens={tokenizeResult.tokens} bind:selectedCharAt />
    </div>
    <ToolbarWithPane
      {onClose}
      {selectedTool}
      grammars={tokenizeResult.grammars}
      sentence={searchText}
      tooltipMode={false}
      {changeSelectedTool}
    />
    <div class="entries">
      <DicEntriesView
        entries={tokenizeResult.entries}
        onSelectEntryForAnki={(selected) => {
          onShowAnkiPreview(selected, tokenizeResult);
        }}
      />
    </div>
  {:else}
    <slot />
  {/if}
</div>

<style>
  .search {
    flex: 0 1 auto;
    min-width: 0;

    height: 100%;
    display: flex;
    flex-direction: column;

    overflow-y: hidden;
  }

  .header {
    display: flex;
    align-items: center;
    padding: 6px var(--edge-horizontal-padding) 0 var(--edge-horizontal-padding);
    background-color: var(--background-alt);
  }

  .header.action-button-mode {
    padding-bottom: 36px;
    border-bottom: 1px solid var(--border);
  }

  .searchbar {
    flex: 1 1;
    min-width: 0;
    display: flex;
    align-items: center;
    height: 100%;
    padding: 2px 4px;
    border-radius: 6px;
    background-color: var(--input);
    border: 1px solid black;
  }
  .searchbar:focus {
    outline: #0969da;
  }

  input {
    flex: 1;
    margin: 0.4em;
    padding: 0px;
    border: 0;
    outline: none;
    background-color: var(--input);
    font-size: 1rem;
  }

  .icon > :global(svg) {
    display: block;
  }

  .icon-search {
    width: 1.25em;
    height: 1.25em;
    fill: #666666;
  }
  .icon-clear {
    width: 1.2em;
    height: 1.2em;
    fill: #666666;
    opacity: 0.8;
  }
  :global(html.desktop) .icon-clear:hover,
  .icon-clear:active {
    opacity: 1;
    cursor: pointer;
  }
  .icon-clear.hidden {
    visibility: hidden;
  }

  .close-button {
    flex: 0 0 auto;
    padding: 2px 8px;
    font-size: 16px;
  }

  .tokensview {
    flex: 0 0 auto;
    max-height: 120px;
    overflow-y: auto;
    padding: 6px var(--edge-horizontal-padding);
    background-color: var(--background-alt);
  }

  .entries {
    flex: 1 1;
    overflow-y: auto;
    background-color: var(--background);
  }
</style>
