<script lang="ts">
  import OptionsGroup from "./OptionsGroup.svelte";
  import { options } from "./types";
</script>

<div>
  <OptionsGroup group={options[0]} />
</div>

<style>
  :global(body) {
    background-color: #eeeeee;
  }
</style>
