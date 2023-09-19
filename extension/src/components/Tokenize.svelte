<script lang="ts">
  import type { Token } from "@platform/backend";
  import type { Entry } from "~/dicEntry";
  import { Platform } from "@platform";
  import Utils from "~/utils";
  import IconSearch from "@icons/search.svg";
  import IconSettings from "@icons/settings.svg";
  import IconCloseCircle from "@icons/close-circle.svg";
  import TokensView from "./TokensView.svelte";
  import { Backend } from "~/backend";
  import DicEntriesView from "./DicEntriesView.svelte";
  import { createEventDispatcher } from "svelte";

  interface Events {
    close: void;
  }

  export let searchText: string = "";
  export let showSettingsButton: boolean = false;
  export let showCloseButton: boolean = false;

  const dispatch = createEventDispatcher<Events>();

  let searchTokens: Token[] = [];
  // may be bigger than entries.length
  let selectedTokenIdx: number;
  let entries: Entry[] = [];

  async function _tokenize(searchText: string) {
    if (searchText === "") {
      searchTokens = [];
      return;
    }

    let result = await Backend.tokenize({
      text: searchText,
      charAt: 0,
    });
    searchTokens = result.tokens;
  }
  const tokenize = Utils.SingleQueued(_tokenize);

  async function _getEntries(tokens: Token[], idx: number) {
    if (idx >= tokens.length) {
      entries = [];
      return;
    }
    entries = await Backend.searchTerm(tokens[idx].base);
  }

  const getEntries = Utils.SingleQueued(_getEntries);

  function openSettings() {
    Platform.openOptionsPage();
  }

  $: tokenize(searchText.normalize("NFC"));
  $: getEntries(searchTokens, selectedTokenIdx);
</script>

<div class="search">
  <div class="header">
    <div class="searchbar">
      <div class="icon icon-search">{@html IconSearch}</div>
      <input
        type="text"
        bind:value={searchText}
        placeholder="Enter japanese word or sentence."
      />
      <div
        class="icon icon-clear"
        class:hidden={searchText === ""}
        on:click={() => {
          searchText = "";
        }}
      >
        {@html IconCloseCircle}
      </div>
    </div>
    {#if showSettingsButton}
      <button class="settings-button" on:click={openSettings}>
        <div class="icon icon-settings">{@html IconSettings}</div>
      </button>
    {/if}
    {#if showCloseButton}
      <div
        class="close-button"
        on:click={() => {
          dispatch("close");
        }}
      >
        Close
      </div>
    {/if}
  </div>
  <div class="tokensview">
    <TokensView tokens={searchTokens} bind:selectedIdx={selectedTokenIdx} />
  </div>
  <div class="entries">
    <DicEntriesView {entries} />
  </div>
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
    padding: 6px 0 6px 6px;
    background-color: var(--background-alt);
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
  .icon-settings {
    width: 14px;
    height: 14px;
    fill: #666666;
  }

  .settings-button {
    flex: 0 0 auto;
    margin: 0 2px;
    padding: 0;
    border: none;
    border-radius: 4px;
    outline: none;
    width: 28px;
    height: 28px;

    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    opacity: 0.8;
  }
  .settings-button:hover,
  .settings-button:focus {
    opacity: 1;
    background: lightgray;
    cursor: pointer;
  }

  .close-button {
    flex: 0 0 auto;
    padding: 2px 8px;
    color: var(--selected-blue);
    font-size: 16px;
  }

  .tokensview {
    flex: 0 0 auto;
    max-height: 120px;
    overflow-y: auto;
    padding: 6px;
    border-bottom: 1px solid var(--border);
    background-color: var(--background-alt);
  }

  .entries {
    flex: 1 1;
    overflow-y: auto;
  }
  .entries > :global(div) {
    border-top: 1px solid var(--border);
  }
  .entries > :global(div:first-child) {
    border-top: none;
  }
</style>
