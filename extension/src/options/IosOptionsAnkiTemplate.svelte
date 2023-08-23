<script lang="ts">
  import Config from "~/config";
  import LoadAnkiTemplate from "./LoadAnkiTemplate.svelte";

  let initialized = initialize();

  async function initialize() {
    await Config.initialize();
  }
</script>

<div class="ios-anki-template">
  {#await initialized then}
    <LoadAnkiTemplate />
  {/await}
</div>

<style>
  .ios-anki-template {
    padding: 16px;
    overflow-x: hidden;
  }
</style>
