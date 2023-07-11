<script lang="ts">
  import MainColumn from "./MainColumn.svelte";
  import PreviewColumn from "./PreviewColumn.svelte";
</script>

<div class="container">
  <div id="main-column"><MainColumn /></div>
  <div id="preview-column"><PreviewColumn /></div>
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
