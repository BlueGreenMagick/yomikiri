<script lang="ts">
  import IconClose from "#icons/close.svg";
  import IconLanguage from "#icons/language.svg";
  import IconSchool from "#icons/school.svg";
  import type { Tools } from "./types";

  export let onClose: () => void;
  export let selectedTool: Tools = null;
  export let translateDisabled = false;
  export let grammarDisabled = false;
  export let tooltipMode: boolean;

  export let changeSelectedTool: (tool: Tools) => void;

  function selectTranslate() {
    if (translateDisabled) return;

    if (selectedTool === "translate") {
      changeSelectedTool(null);
    } else {
      changeSelectedTool("translate");
    }
  }

  function selectGrammar() {
    if (grammarDisabled) return;

    if (selectedTool === "grammar") {
      changeSelectedTool(null);
    } else {
      changeSelectedTool("grammar");
    }
  }
</script>

<div class="toolbar" class:tooltip={tooltipMode}>
  <div class="left buttons">
    <button
      class="tool-button"
      class:selected={selectedTool === "translate"}
      disabled={translateDisabled}
      title="Translate sentence"
      on:click={selectTranslate}
    >
      <div class="icon"><IconLanguage /></div>
    </button>

    <button
      class="tool-button"
      class:selected={selectedTool === "grammar"}
      disabled={grammarDisabled}
      title="Grammar"
      on:click={selectGrammar}
    >
      <div class="icon"><IconSchool /></div>
    </button>
  </div>
  <div class="right buttons">
    {#if tooltipMode}
      <button
        class="tool-button"
        title="Close"
        on:click={() => {
          onClose();
        }}
      >
        <div class="icon"><IconClose /></div>
      </button>
    {/if}
  </div>
</div>

<style>
  .toolbar {
    width: 100%;
    background-color: var(--toolbar-background);
    height: 2.2em;
    display: flex;
  }

  .buttons {
    display: flex;
  }

  .left {
    flex: 1 0 auto;
  }

  .right {
    flex: 0 0 auto;
  }

  .tool-button {
    background-color: var(--toolbar-background);
    padding: 0.5em 1.2em;
  }

  :global(html.desktop) .tool-button:not(:disabled):hover {
    cursor: pointer;
  }

  :global(html.desktop) .tooltip .tool-button:not(:disabled):not(.selected):hover,
  :global(html.desktop) .tooltip .tool-button:not(:disabled):not(.selected):focus-visible {
    filter: brightness(1.1);
    outline: none;
  }

  :global(html.desktop) .tool-button:not(:disabled):not(.selected):hover {
    filter: brightness(0.9);
  }

  .tool-button.selected {
    background-color: var(--toolbar-foreground);
  }

  .icon {
    fill: #000000;
    width: 1.2em;
    height: 1.2em;
  }

  .tool-button:disabled .icon {
    fill: #999999;
  }
</style>
