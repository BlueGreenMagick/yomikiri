<script lang="ts">
  import { platformClass } from "~/components/actions";
  import Tokenize from "~/components/Tokenize.svelte";

  export let initialized: Promise<void>;
</script>

<div id="main" use:platformClass>
  {#await initialized then}
    <Tokenize />
  {/await}
</div>

<style global>
  @import "../global.css";

  html,
  html body {
    height: 100%;
  }

  #main {
    height: 100%;
    min-height: 200px;
    min-width: 300px;
    margin: 0 auto;
    padding: 0;
  }
</style>
