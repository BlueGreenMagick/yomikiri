<script lang="ts">
  import type { Token } from "@platform/backend";
  import type { Entry } from "~/dicEntry";
  import { Platform } from "@platform";
  import { Api } from "~/api";
  import Utils from "~/utils";
  import IconSearch from "@icons/search.svg";
  import IconSettings from "@icons/settings.svg";
  import IconCloseCircle from "@icons/close-circle.svg";
  import TokensView from "./TokensView.svelte";
  import DicEntryView from "~/components/DicEntryView.svelte";

  let searchText: string = "";
  let searchTokens: Token[] = [];
  // may be bigger than entries.length
  let selectedTokenIdx: number;
  let entries: Entry[] = [];

  async function _tokenize(searchText: string) {
    if (searchText === "") {
      searchTokens = [];
      return;
    }

    let result = await Api.request("tokenize", {
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
    entries = await Api.request("searchTerm", tokens[idx].base);
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
    <button class="settings-button" on:click={openSettings}>
      <div class="icon icon-settings">{@html IconSettings}</div>
    </button>
  </div>
  <div class="tokensview">
    <TokensView tokens={searchTokens} bind:selectedIdx={selectedTokenIdx} />
  </div>
  <div class="entries">
    {#each entries as entry}
      <DicEntryView {entry} />
    {/each}
  </div>
</div>

<style>
  /** In desktop, window size changes based on content, but is fixed in ios */
  :global(.ios) .search {
    max-height: 100%;
  }

  :global(.desktop) .search {
    max-height: 600px;
  }

  .search {
    display: flex;
    flex-direction: column;

    overflow-y: hidden;
  }

  .header {
    display: flex;
    align-items: center;
    margin: 6px 0 6px 6px;
  }

  .searchbar {
    flex: 1 1;
    display: flex;
    align-items: center;
    height: 100%;
    padding: 2px 4px;
    border-radius: 6px;
    border: 1px solid grey;
    background-color: #f6f6f6;
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
    background-color: #f6f6f6;
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

  .tokensview {
    flex: 0 0 auto;
    max-height: 120px;
    overflow-y: auto;
    padding: 6px;
    border-bottom: 1px solid lightgray;
  }

  .entries {
    flex: 1 1;
    overflow-y: auto;
  }
  .entries > :global(div) {
    border-top: 1px solid lightgray;
  }
  .entries > :global(div:first-child) {
    border-top: none;
  }
</style>
