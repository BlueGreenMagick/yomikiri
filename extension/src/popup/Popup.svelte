<script lang="ts">
  import Tokenize from "./Tokenize.svelte";
  import { platformClass } from "~/components/actions";

  export let initialized: Promise<void>;
</script>

<div class="container" use:platformClass>
  <Tokenize {initialized} />
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
