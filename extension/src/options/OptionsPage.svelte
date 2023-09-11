<script lang="ts">
  import "../global.css";
  import "./styles.css";
  import MainColumn from "./MainColumn.svelte";
  import PreviewColumn from "./PreviewColumn.svelte";
  import { Platform } from "~/platform/desktop";
  import { platformClass } from "~/components/actions";

  export let initialized: Promise<void>;
</script>

<div class="container" use:platformClass>
  {#await initialized then}
    <div id="main-column"><MainColumn /></div>
    {#if Platform.IS_DESKTOP}
      <div id="preview-column"><PreviewColumn /></div>
    {/if}
  {/await}
</div>

<style>
  @media (max-width: 900px) {
    #preview-column {
      display: none;
    }
  }

  .container {
    display: flex;
    margin: 0px 12px;
    gap: 12px;
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
