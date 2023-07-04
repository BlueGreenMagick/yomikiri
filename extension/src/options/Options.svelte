<script lang="ts">
  import MainColumn from "./MainColumn.svelte";
  import PreviewColumn from "./PreviewColumn.svelte";

  export let initializing: Promise<any>;
</script>

{#await initializing then}
  <div class="container">
    <div id="main-column"><MainColumn /></div>
    <div id="preview-column"><PreviewColumn /></div>
  </div>
{/await}

<style>
  @media (max-width: 900px) {
    #preview-column {
      display: none;
    }
  }

  .container {
    display: flex;
    margin: 12px;
    gap: 12px;
  }

  #main-column {
    max-width: 900px;
    flex: 1 1 auto;
  }

  #preview-column {
    max-width: 500px;
    flex: 1 0 300px;
  }
</style>
