<script lang="ts">
  import "normalize.css";
  import "../global.css";
  import "./styles.css";
  import Tokenize from "~/components/Tokenize.svelte";
  import { platformClass } from "~/components/actions";

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
