<script lang="ts">
  import { Toast } from "lib/toast";
  import { platformClass } from "./actions";
  import { getErrorMessage } from "lib/utils";

  function handleGlobalError(ev: Event) {
    let error: unknown = (ev as ErrorEvent).error;
    // Ignore non-JS error
    if (error === undefined) {
      console.error("Non-JS Error");
    }

    console.error("Error: ", error);
    Toast.error(getErrorMessage(error));
  }

  function handleGlobalRejection(err: PromiseRejectionEvent) {
    console.error("Error: ", err.reason);
    Toast.error(getErrorMessage(err.reason));
  }

  window.addEventListener("error", () => {
    console.error("error occured");
  });
</script>

<svelte:window
  on:error={handleGlobalError}
  on:unhandledrejection={handleGlobalRejection}
/>
<svelte:body use:platformClass />

{#await Promise.resolve() then}
  <slot />
{/await}

<style global>
  @import "../global.css";
</style>
