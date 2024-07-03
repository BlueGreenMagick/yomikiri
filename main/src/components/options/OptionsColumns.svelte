<script lang="ts">
  import type { AnkiOptionsApi } from "@platform/anki";
  import type { Dictionary } from "@platform/dictionary";
  import type { Config } from "lib/config";
  import MainColumn from "./MainColumn.svelte";
  import PreviewColumn from "./PreviewColumn.svelte";
  import { Platform } from "@platform";

  export let config: Config;
  export let ankiApi: AnkiOptionsApi;
  export let dictionary: Dictionary;
</script>

<div class="container">
  <div id="main-column">
    <MainColumn {config} {ankiApi} {dictionary} />
  </div>
  {#if Platform.IS_DESKTOP}
    <div id="preview-column"><PreviewColumn {config} /></div>
  {/if}
</div>

<style>
  .container {
    display: flex;
    margin: 0px 12px;
    gap: 12px;
  }

  @media (max-width: 900px) {
    #preview-column {
      display: none;
    }
  }

  #main-column {
    max-width: 900px;
    flex: 2 1 0;
    margin: 12px 0px;
  }

  #preview-column {
    max-width: 500px;
    min-width: 300px;
    flex: 1 0 0;
  }
</style>
