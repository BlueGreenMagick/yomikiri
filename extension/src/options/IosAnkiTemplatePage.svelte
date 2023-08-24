<script lang="ts">
  import LoadAnkiTemplate from "./LoadAnkiTemplate.svelte";
  import { platformClass } from "~/components/actions";

  export let initialized: Promise<void>;
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
