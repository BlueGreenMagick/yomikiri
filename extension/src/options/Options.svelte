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
