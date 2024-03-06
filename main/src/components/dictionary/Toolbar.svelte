<script lang="ts" context="module">
  export type Tools = "translate" | "grammar";
</script>

<script lang="ts">
  import IconSchool from "@icons/school.svg";
  import IconLanguage from "@icons/language.svg";
  import IconClose from "@icons/close.svg";
  import { Tooltip } from "~/extension/content/tooltip";
  import { Highlighter } from "~/extension/content/highlight";

  export let selectedTool: Tools | null = null;
  export let translateDisabled: boolean = false;
  export let grammarDisabled: boolean = false;
  export let showClose;

  export let changeSelectedTool: (tool: Tools | null) => any;

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

  function closeTooltip() {
    Tooltip.hide();
    Highlighter.unhighlight();
  }
</script>

<div class="toolbar">
  <div class="left buttons">
    <div
      class="tool-button"
      class:selected={selectedTool === "translate"}
      class:disabled={translateDisabled}
      title="Translate sentence"
      on:click={selectTranslate}
    >
      <div class="icon">{@html IconLanguage}</div>
    </div>

    <div
      class="tool-button"
      class:selected={selectedTool === "grammar"}
      class:disabled={grammarDisabled}
      title="Grammar"
      on:click={selectGrammar}
    >
      <div class="icon">{@html IconSchool}</div>
    </div>
  </div>
  <div class="right buttons">
    {#if showClose}
      <div class="tool-button" title="Close" on:click={closeTooltip}>
        <div class="icon">{@html IconClose}</div>
      </div>
    {/if}
  </div>
</div>

<style>
  .toolbar {
    width: 100%;
    background-color: var(--background-dark);

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
    background-color: var(--background-dark);
    padding: 6px 12px;
  }

  .tool-button:not(.disabled):hover {
    cursor: pointer;
  }

  .tool-button:not(.disabled):not(.selected):hover {
    filter: brightness(1.1);
  }

  .tool-button.selected {
    background-color: var(--background-alt);
  }

  .icon {
    fill: #000000;
    width: 16px;
    height: 16px;
  }

  .tool-button.disabled .icon {
    fill: #999999;
  }
</style>
