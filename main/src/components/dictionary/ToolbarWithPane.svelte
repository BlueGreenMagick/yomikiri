<script lang="ts">
  import Toolbar, { type Tools } from "./Toolbar.svelte";
  import GrammarPane from "./GrammarPane.svelte";
  import TranslatePane from "./TranslatePane.svelte";
  import type { GrammarInfo } from "@yomikiri/yomikiri-rs";

  export let selectedTool: Tools | null;
  export let grammars: GrammarInfo[] = [];
  export let sentence: string;
  export let showClose: boolean = true;
  export let hideTools: boolean = false;

  export let changeSelectedTool: (tool: Tools | null) => any;
</script>

<div class="toolbar-with-pane">
  <Toolbar
    grammarDisabled={grammars.length == 0}
    {selectedTool}
    {showClose}
    {hideTools}
    {changeSelectedTool}
  />
  <div class="tools-pane" class:hidden={selectedTool === null}>
    <TranslatePane {sentence} shown={selectedTool === "translate"} />
    <GrammarPane {grammars} shown={selectedTool === "grammar"} />
  </div>
</div>

<style>
  .toolbar-with-pane {
    flex: 0 1 auto;
  }

  .tools-pane {
    border-bottom: 1px solid var(--border);
    max-height: 160px;
    overflow-y: auto;
  }

  .tools-pane.hidden {
    display: none;
  }
</style>
