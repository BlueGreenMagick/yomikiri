<script lang="ts">
  import type { Token } from "~/tokenizer";
  import IconSearch from "@icons/search.svg";
  import TokensView from "./TokensView.svelte";
  import { Api } from "~/api";
  import EntriesView from "~/tooltip/EntriesView.svelte";
  import type { Entry } from "~/dicEntry";
  import Utils from "~/utils";

  let searchText: string = "";
  let searchTokens: Token[] = [];
  let selectedTokenIdx: number;
  let entries: Entry[] = [];

  async function _tokenize(searchText: string) {
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

<div>
  <div class="searchbar">
    <div class="icon">{@html IconSearch}</div>
    <input
      type="text"
      bind:value={searchText}
      placeholder="Enter japanese word or sentence."
    />
  </div>
  <TokensView tokens={searchTokens} bind:selectedIdx={selectedTokenIdx} />
  <div class="entries">
    <EntriesView {entries} />
  </div>
</div>

<style>
  .searchbar {
    display: flex;
    align-items: center;
    height: 28px;
    padding: 2px;
    margin: 4px;
    border-radius: 6px;
    border: 1px solid grey;
  }

  .searchbar:focus {
    outline: #0969da;
  }

  .icon {
    width: 16px;
    fill: grey;
  }

  input {
    flex: 1 1;
    margin: 2px;
    line-height: 20px;
    border: 0;
    outline: none;
  }
  .entries {
    overflow-y: auto;
  }
</style>
