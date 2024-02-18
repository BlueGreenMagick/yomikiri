<script lang="ts">
  import type { Token, TokenizeResult } from "@platform/backend";
  import type { Entry } from "~/dicEntry";
  import { Platform } from "@platform";
  import Utils from "~/utils";
  import IconSearch from "@icons/search.svg";
  import IconSettings from "@icons/settings.svg";
  import IconPower from "@icons/power.svg";
  import IconCloseCircle from "@icons/close-circle.svg";
  import TokensView from "./TokensView.svelte";
  import { Backend } from "~/backend";
  import DicEntriesView from "./DicEntriesView.svelte";
  import { createEventDispatcher } from "svelte";
  import TextButton from "./TextButton.svelte";
  import Config from "~/config";
  import { BrowserApi } from "~/browserApi";

  interface Events {
    close: void;
  }

  export let searchText: string = "";
  export let actionButtons: boolean = false;
  export let showCloseButton: boolean = false;

  const dispatch = createEventDispatcher<Events>();

  let searchTokens: Token[] = [];
  // may be bigger than total token characters
  let selectedCharAt: number;
  let entries: Entry[] = [];
  // TODO: Move this to Config store
  let stateEnabled = Config.get("state.enabled");

  /** modifies `searchTokens` */
  const tokenize = Utils.SingleQueued(_tokenize);
  async function _tokenize(searchText: string, charAt: number) {
    if (searchText === "") {
      searchTokens = [];
      entries = [];
      return;
    }

    charAt = Math.min(charAt, searchText.length - 1);

    const tokenized = await Backend.tokenize({
      text: searchText,
      charAt: charAt,
    });
    searchTokens = tokenized.tokens;
    entries = tokenized.entries;
  }

  function openSettings() {
    Platform.openOptionsPage();
  }

  function toggleEnable() {
    let prevValue = Config.get("state.enabled");
    stateEnabled = !prevValue;
    Config.set("state.enabled", stateEnabled);
    BrowserApi.requestToAllTabs("stateEnabledChanged", stateEnabled);
  }

  function close() {
    dispatch("close");
  }

  $: tokenize(searchText, selectedCharAt);
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
    {#if showCloseButton}
      <div class="close-button">
        <TextButton label="Close" on:click={close} />
      </div>
    {/if}
  </div>
  <div class="tokensview">
    <TokensView tokens={searchTokens} bind:selectedCharAt />
  </div>
  {#if searchText !== ""}
    <div class="entries">
      <DicEntriesView {entries} />
    </div>
  {:else if actionButtons}
    <div class="action-buttons">
      <div
        class="icon-action"
        class:active={stateEnabled}
        on:click={toggleEnable}
        title={stateEnabled ? "Disable" : "Enable"}
      >
        {@html IconPower}
      </div>
      <div class="icon-action" on:click={openSettings} title="Open Settings">
        {@html IconSettings}
      </div>
    </div>
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
    padding: 6px var(--edge-horizontal-padding);
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

  .icon-action {
    width: 36px;
    height: 36px;
    background-color: var(--button-bg);
    fill: white;
    border-radius: 4px;
    padding: 4px;
    transition: background-color 0.25s;
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
    margin-top: 64px;
    width: 100%;

    display: flex;
    gap: 8px;
    flex-direction: row;
    justify-content: center;
  }

  :global(html.ios) .action-buttons {
    margin-top: 80px;
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
    border-bottom: 1px solid var(--border);
    background-color: var(--background-alt);
  }

  .entries {
    flex: 1 1;
    overflow-y: auto;
  }
</style>
