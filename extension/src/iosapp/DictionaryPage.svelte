<script lang="ts">
  import { platformClass } from "~/components/actions";
  import Tokenize from "~/components/Tokenize.svelte";

  export let initialized: Promise<void>;
</script>

<div class="container" use:platformClass>
  {#await initialized then}
    <Tokenize />
  {/await}
</div>

<style>
  .container {
    height: 100%;
    min-height: 200px;
    min-width: 300px;
    margin: 0 auto;
    padding: 0;
  }
</style>
