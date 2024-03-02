<script lang="ts">
  import LoadAnkiTemplate from "../options/modals/LoadAnkiTemplate.svelte";
  import { platformClass } from "~/components/actions";

  export let initialized: Promise<void>;
</script>

<div id="main" use:platformClass>
  {#await initialized then}
    <LoadAnkiTemplate />
  {/await}
</div>

<style global>
  @import "../global.css";
  @import "../options/styles.css";

  #main {
    padding: 16px;
    overflow-x: hidden;
  }
</style>
