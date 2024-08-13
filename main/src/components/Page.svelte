<script lang="ts">
  import { Toast } from "lib/toast";
  import { platformClass } from "./actions";
  import { YomikiriError } from "lib/error";

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
</script>

<svelte:window
  on:error={handleGlobalError}
  on:unhandledrejection={handleGlobalRejection}
/>

{#await Promise.resolve() then}
  <slot />
{/await}
<div use:platformClass style="display: none;" />

<style global>
  @import "../global.css";
</style>
