<script lang="ts">
  import { Toast } from "lib/toast";
  import { platformClass } from "./actions";
  import { YomikiriError } from "lib/error";

  function handleGlobalError(ev: Event) {
    const error = YomikiriError.from((ev as ErrorEvent).error);
    console.error(error);
    Toast.error(error.message, error.details.join("\n"));
  }

  function handleGlobalRejection(ev: PromiseRejectionEvent) {
    const error = YomikiriError.from(ev.reason);
    console.error(error);
    Toast.error(error.message, error.details.join("\n"));
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
