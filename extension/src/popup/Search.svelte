<script lang="ts">
  import type { Token } from "~/tokenizer";
  import type { Entry } from "~/dicEntry";
  import { Api } from "~/api";
  import Utils from "~/utils";
  import IconSearch from "@icons/search.svg";
  import IconCloseCircle from "@icons/close-circle.svg";
  import TokensView from "./TokensView.svelte";
  import DicEntryView from "~/components/dictionary/DicEntryView.svelte";

  let searchText: string = "";
  let searchTokens: Token[] = [];
  let selectedTokenIdx: number;
  let entries: Entry[] = [];

  async function _tokenize(searchText: string) {
    if (searchText === "") {
      searchTokens = [];
      return;
    }

    let result = await Api.request("tokenize", {
      text: searchText,
      selectedCharIdx: 0,
    });
    searchTokens = result.tokens;
  }
  const tokenize = Utils.SingleQueued(_tokenize);

  async function _getEntries(tokens: Token[], idx: number) {
    if (tokens.length === 0) {
      entries = [];
      return;
    }
    entries = await Api.request("searchTerm", tokens[idx].baseForm);
  }

  const getEntries = Utils.SingleQueued(_getEntries);

  $: tokenize(searchText);
  $: getEntries(searchTokens, selectedTokenIdx);
</script>

<div class="search">
  <div class="searchbar">
    <div class="icon-search">{@html IconSearch}</div>
    <input
      type="text"
      bind:value={searchText}
      placeholder="Enter japanese word or sentence."
    />
    <div
      class="icon-close"
      on:click={() => {
        searchText = "";
      }}
    >
      {@html IconCloseCircle}
    </div>
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
  .search {
    display: flex;
    flex-direction: column;
    max-height: 600px;
  }

  .searchbar {
    display: flex;
    align-items: center;
    height: 28px;
    padding: 2px 4px;
    margin: 6px;
    border-radius: 6px;
    border: 1px solid grey;
  }

  .searchbar:focus {
    outline: #0969da;
  }

  .icon-search {
    width: 16px;
    fill: grey;
    margin-top: 1px;
  }
  .icon-close {
    width: 12px;
    fill: grey;
    margin-top: 2px;
  }
  .icon-close:hover {
    opacity: 0.8;
    cursor: pointer;
  }

  .tokensview {
    flex: 0 0;
    max-height: 120px;
    overflow-y: auto;
    padding: 6px;
    border-bottom: 1px solid lightgray;
  }
  input {
    flex: 1;
    margin: 2px;
    line-height: 20px;
    border: 0;
    outline: none;
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
