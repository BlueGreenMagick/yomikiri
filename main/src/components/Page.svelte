<script lang="ts">
  import { Toast } from "lib/toast";
  import { YomikiriError } from "lib/error";
  import { Config } from "lib/config";
  import { platformClass, setStyle } from "./actions";

  function handleGlobalError(ev: Event) {
    const error = YomikiriError.from((ev as ErrorEvent).error);
    error.logConsole();
    Toast.yomikiriError(error);
  }

  function handleGlobalRejection(ev: PromiseRejectionEvent) {
    const error = YomikiriError.from(ev.reason);
    error.logConsole();
    Toast.yomikiriError(error);
  }

  async function initialize(): Promise<void> {
    // Config must be initialized before rendering svelte components,
    // as components may call `useConfig()` which assumes config is initialized.
    await Config.instance.get();
  }
</script>

<svelte:window
  on:error={handleGlobalError}
  on:unhandledrejection={handleGlobalRejection}
/>

{#await initialize()}
  Initializing config...
{:then}
  <slot />
{/await}
<div use:platformClass use:setStyle style="display: none;" />

<style global>
  @import "../global.css";
</style>
