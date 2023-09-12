<script lang="ts">
  import { platformClass } from "~/components/actions";
  import OptionsColumns from "./OptionsColumns.svelte";

  export let initialized: Promise<void>;
</script>

<div use:platformClass>
  {#await initialized then}
    <OptionsColumns />
  {/await}
</div>

<style global>
  @import "../global.css";
  @import "./styles.css";
</style>
