<script lang="ts">
  import { TokenizeResult, Backend } from "@platform/backend";
  import Utils from "~/utils";
  import IconSearch from "@icons/search.svg";
  import IconCloseCircle from "@icons/close-circle.svg";
  import SentenceView from "./SentenceView.svelte";
  import DicEntriesView from "./DicEntriesView.svelte";
  import { createEventDispatcher } from "svelte";
  import TextButton from "../TextButton.svelte";
  import ToolbarWithPane from "./ToolbarWithPane.svelte";
  import type { Tools } from "./Toolbar.svelte";
  import type { SelectedEntryForAnki } from "./DicEntryView.svelte";

  interface Events {
    close: void;
  }

  export let searchText: string = "";
  export let actionButtons: boolean = false;
  export let showCloseButton: boolean = false;
  export let onShowAnkiPreview: (
    selectedEntry: SelectedEntryForAnki,
    tokenizeResult: TokenizeResult
  ) => void;

  const dispatch = createEventDispatcher<Events>();

  let tokenizeResult: TokenizeResult = TokenizeResult.empty();
  // may be bigger than total token characters
  let selectedCharAt: number = 0;
  let selectedTool: Tools | null = null;

  /** modifies `searchTokens` */
  const tokenize = Utils.SingleQueued(_tokenize);
  async function _tokenize(searchText: string, charAt: number) {
    charAt = Math.min(charAt, searchText.length - 1);
    tokenizeResult = await Backend.tokenize(searchText, charAt);
  }

  function close() {
    dispatch("close");
  }

  function changeSelectedTool(tool: Tools | null) {
    selectedTool = tool;
  }

  $: tokenize(searchText, selectedCharAt);
</script>

<div class="search">
  <div class="header" class:action-button-mode={searchText === ""}>
    <div class="searchbar">
      <div class="icon icon-search"><IconSearch /></div>
      <input
        type="text"
        bind:value={searchText}
        placeholder="Enter japanese word or sentence."
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
        <TextButton label="Close" on:click={close} />
      </div>
    {/if}
  </div>
  {#if searchText !== ""}
    <div class="tokensview">
      <SentenceView tokens={tokenizeResult.tokens} bind:selectedCharAt />
    </div>
    <ToolbarWithPane
      {selectedTool}
      grammars={tokenizeResult.grammars}
      sentence={searchText}
      tooltipMode={false}
      {changeSelectedTool}
    />
    <div class="entries">
      <DicEntriesView
        entries={tokenizeResult.entries}
        on:selectedEntryForAnki={(ev) => {
          onShowAnkiPreview(ev.detail, tokenizeResult);
        }}
      />
    </div>
  {:else if actionButtons}
    <slot />
  {/if}
</div>

<style>
  .search {
    flex: 0 1 auto;

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
    margin: 4px;
    padding: 0px;
    border: 0;
    outline: none;
    background-color: var(--input);
    font-size: 1em;
  }

  .icon > :global(svg) {
    display: block;
  }

  .icon-search {
    width: 16px;
    height: 16px;
    fill: #666666;
  }
  .icon-clear {
    width: 14px;
    height: 14px;
    fill: #666666;
    opacity: 0.8;
  }
  .icon-clear:hover {
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
  }
</style>
