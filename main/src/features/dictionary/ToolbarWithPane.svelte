<script lang="ts">
  import type { GrammarInfo } from "@yomikiri/backend-bindings";
  import type { AppCtx } from "../ctx";
  import GrammarPane from "./GrammarPane.svelte";
  import Toolbar from "./Toolbar.svelte";
  import TranslatePane from "./TranslatePane.svelte";
  import type { Tools } from "./types";

  export let ctx: AppCtx;
  export let onClose: () => void;
  export let selectedTool: Tools | null;
  export let grammars: GrammarInfo[] = [];
  export let sentence: string;
  export let tooltipMode: boolean;

  export let changeSelectedTool: (tool: Tools) => void;
</script>

<div
  class="toolbar-with-pane"
  style:--toolbar-foreground={tooltipMode ?
  "var(--background-alt)" :
  "var(--background-dark)"}
  style:--toolbar-background={tooltipMode ?
  "var(--background-dark)" :
  "var(--background-alt)"}
>
  <Toolbar
    {onClose}
    grammarDisabled={grammars.length == 0}
    {selectedTool}
    {tooltipMode}
    {changeSelectedTool}
  />
  <div class="tools-pane" class:hidden={selectedTool === null}>
    <TranslatePane {ctx} {sentence} shown={selectedTool === "translate"} />
    <GrammarPane {grammars} shown={selectedTool === "grammar"} />
  </div>
</div>

<style>
  .toolbar-with-pane {
    flex: 0 1 auto;
    min-width: 0;
    border-bottom: 1px solid var(--border);
  }

  .tools-pane {
    background-color: var(--toolbar-foreground);
    max-height: 160px;
    overflow-y: auto;
  }

  .tools-pane.hidden {
    display: none;
  }
</style>
