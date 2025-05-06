<script lang="ts">
  import { Config } from "@/features/config";
  import PageSetup from "./PageSetup.svelte";

  async function initialize(): Promise<void> {
    // Config must be initialized before rendering svelte components,
    // as components may call `useConfig()` which assumes config is initialized.
    await Config.instance.get();
  }
</script>

{#await initialize()}
  Initializing config...
{:then}
  <slot />
{/await}
<PageSetup />
