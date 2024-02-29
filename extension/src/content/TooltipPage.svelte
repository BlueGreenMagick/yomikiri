<script lang="ts">
  import type { Entry } from "~/dicEntry";
  import { platformClass } from "~/components/actions";
  import type { LoadingNoteData } from "~/ankiNoteBuilder";
  import { type Tools } from "~/components/Toolbar.svelte";
  import type { GrammarInfo } from "@yomikiri/yomikiri-rs";
  import Tooltip from "./Tooltip.svelte";

  let previewIsVisible = false;
  let entries: Entry[] = [];
  let grammars: GrammarInfo[] = [];
  let previewNoteData: LoadingNoteData;
  let selectedTool: Tools | null = null;

  export function showEntries(e: Entry[], g: GrammarInfo[]) {
    previewIsVisible = false;
    entries = e;
    grammars = g;
    selectedTool = null;
  }

  export function showPreview(entry: Entry, noteData: LoadingNoteData) {
    previewIsVisible = true;
    previewNoteData = noteData;
  }
</script>

<div id="main" use:platformClass>
  <Tooltip
    {previewIsVisible}
    {entries}
    {grammars}
    {previewNoteData}
    {selectedTool}
    on:updateHeight
  />
</div>

<style global>
  @import "../global.css";

  #main {
    max-height: 300px;
    overflow-y: auto;
  }
</style>
