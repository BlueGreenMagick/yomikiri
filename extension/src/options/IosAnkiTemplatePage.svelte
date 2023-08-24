<script lang="ts">
  import Config from "~/config";
  import LoadAnkiTemplate from "./LoadAnkiTemplate.svelte";
  import { platformClass } from "~/components/actions";

  let initialized = initialize();

  async function initialize() {
    await Config.initialize();
  }
</script>

<div class="ios-anki-template" use:platformClass>
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
