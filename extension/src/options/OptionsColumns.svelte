<script lang="ts">
  import MainColumn from "./MainColumn.svelte";
  import PreviewColumn from "./PreviewColumn.svelte";
  import { Platform } from "@platform";
</script>

<div class="container">
  <div id="main-column"><MainColumn /></div>
  {#if Platform.IS_DESKTOP}
    <div id="preview-column"><PreviewColumn /></div>
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
  }

  #preview-column {
    max-width: 500px;
    min-width: 300px;
    flex: 1 0 0;
  }
</style>
